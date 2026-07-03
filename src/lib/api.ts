import { 
  COMMUNITIES, MEMBERS, EVENTS, JOBS, BUSINESSES, 
  MATRIMONY, DONATIONS, CAMPAIGNS, NEWS, COMMITTEE, FAMILIES 
} from "@/data/mock";

const HOSTNAME = typeof window !== "undefined" ? window.location.hostname : "localhost";
const API_BASE = `/api`;

export function getImageUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  const path = url.startsWith("/") ? url : `/${url}`;
  return path;
}

// Helper to handle fetch with optional authorization
async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("wag_token") : null;
  const headers: Record<string, string> = {
    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> || {}),
  };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMessage = `API error: ${response.statusText}`;
      let errorFields: any = null;
      try {
        const errorData = await response.json();
        if (errorData) {
          errorFields = errorData;
          if (errorData.detail) {
            errorMessage = errorData.detail;
          } else if (typeof errorData === 'object') {
            errorMessage = Object.entries(errorData)
              .map(([key, val]) => {
                if (Array.isArray(val)) {
                  const formattedVals = val.map(item => {
                    if (item && typeof item === 'object') {
                      return Object.entries(item)
                        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
                        .join(', ');
                    }
                    return String(item);
                  });
                  return `${key}: ${formattedVals.join('; ')}`;
                } else if (val && typeof val === 'object') {
                  return `${key}: ${JSON.stringify(val)}`;
                }
                return `${key}: ${val}`;
              })
              .join('; ');
          }
        }
      } catch (e) {
        // Keep statusText fallback
      }
      const err = new Error(errorMessage) as any;
      err.status = response.status;
      err.errorFields = errorFields;
      
      // Auto-logout on invalid token or deleted user
      if (response.status === 401 && (errorMessage.includes("User not found") || errorMessage.includes("token not valid"))) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("wag_user");
          localStorage.removeItem("wag_token");
          localStorage.removeItem("wag_refresh");
          window.location.href = "/login";
        }
      }
      
      throw err;
    }

    // Handle 204 No Content (e.g. DELETE responses) — no body to parse
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return undefined as unknown as T;
    }

    return response.json();
  } catch (error) {
    console.error("API fetch error:", error);
    throw error;
  }
}

export const api = {
  // Authentication
  async login(username: string, password: string) {
    try {
      const res = await apiFetch<{ access: string; refresh: string; user: any; member?: any }>("/auth/login/", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      if (res.access) {
        localStorage.setItem("wag_token", res.access);
        localStorage.setItem("wag_refresh", res.refresh);
      }
      return {
        ...res.user,
        role: res.member?.role || "member",
        communityName: res.member?.community_name || "Platform",
        communityId: res.member?.community_id,
        communityLogo: res.member?.community_logo,
        communityCover: res.member?.community_cover,
        communityType: res.member?.community_type,
        parentCommunityName: res.member?.parent_community_name,
        parentCommunityType: res.member?.parent_community_type,
        parentCommunityId: res.member?.parent_community_id,
        gender: res.member?.gender,
        customRoleName: res.member?.custom_role_name,
        permissions: res.member?.permissions || []
      };
    } catch (e) {
      console.error("Login failed", e);
      throw e;
    }
  },

  async register(data: any) {
    try {
      const isFormData = data instanceof FormData;
      return await apiFetch<any>("/auth/register/", {
        method: "POST",
        body: isFormData ? data : JSON.stringify(data),
      });
    } catch (e) {
      console.error("Registration failed", e);
      throw e;
    }
  },

  async forgotPassword(email: string) {
    return await apiFetch<any>("/auth/forgot-password/", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  async verifyForgotOTP(email: string, otp: string) {
    return await apiFetch<any>("/auth/verify-forgot-otp/", {
      method: "POST",
      body: JSON.stringify({ email, otp }),
    });
  },

  async resetPassword(email: string, otp: string, p1: string, p2: string) {
    return await apiFetch<any>("/auth/reset-password/", {
      method: "POST",
      body: JSON.stringify({ email, otp, new_password: p1, confirm_password: p2 }),
    });
  },

  async registerSendOTP(email: string) {
    return await apiFetch<any>("/auth/register-send-otp/", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  async registerVerifyOTP(email: string, otp: string) {
    return await apiFetch<any>("/auth/register-verify-otp/", {
      method: "POST",
      body: JSON.stringify({ email, otp }),
    });
  },

  async getCurrentUser() {
    try {
      const res = await apiFetch<any>("/auth/me/", { cache: "no-store" });
      if (res) {
        return {
          ...res,
          role: res.member?.role || "member",
          communityName: res.member?.community_name || "Platform",
          communityId: res.member?.community_id,
          communityLogo: res.member?.community_logo,
          communityCover: res.member?.community_cover,
          communityType: res.member?.community_type,
          parentCommunityName: res.member?.parent_community_name,
          parentCommunityType: res.member?.parent_community_type,
          parentCommunityId: res.member?.parent_community_id,
          gender: res.member?.gender,
          customRoleName: res.member?.custom_role_name,
          permissions: res.member?.permissions || []
        };
      }
      return null;
    } catch (e) {
      console.warn("Failed to get current user", e);
      return null;
    }
  },

  // Communities
  async getCommunities(filters?: any): Promise<any[]> {
    try {
      const query = new URLSearchParams(filters || {}).toString();
      const endpoint = query ? `/communities/?${query}` : "/communities/";
      return await apiFetch<any[]>(endpoint, { cache: "no-store" });
    } catch (e) {
      console.warn("Django API failed, falling back to mock COMMUNITIES", e);
      return COMMUNITIES;
    }
  },

  async getCommunity(id: string): Promise<any> {
    try {
      return await apiFetch<any>(`/communities/${id}/`, { cache: "no-store" });
    } catch (e) {
      console.warn(`Failed to get community ${id}`, e);
      return COMMUNITIES.find((c: any) => c.id === parseInt(id));
    }
  },

  async createCommunity(data: any): Promise<any> {
    try {
      const isFormData = data instanceof FormData;
      return await apiFetch<any>("/communities/", {
        method: "POST",
        body: isFormData ? data : JSON.stringify(data),
      });
    } catch (e) {
      console.error("Failed to create community", e);
      throw e;
    }
  },

  async updateCommunity(id: string, data: any): Promise<any> {
    try {
      const isFormData = data instanceof FormData;
      return await apiFetch<any>(`/communities/${id}/`, {
        method: "PATCH",
        body: isFormData ? data : JSON.stringify(data),
      });
    } catch (e) {
      console.error("Failed to update community", e);
      throw e;
    }
  },

  async getCommunityStats(communityId: string): Promise<any> {
    try {
      return await apiFetch<any>(`/communities/${communityId}/statistics/`);
    } catch (e) {
      console.warn(`Failed to get community stats`, e);
      return { members_count: 0, events_count: 0 };
    }
  },

  async approveCommunity(id: string, remarks?: string): Promise<any> {
    return await apiFetch<any>(`/communities/${id}/approve/`, {
      method: "POST",
      body: JSON.stringify({ remarks: remarks || "Approved." })
    });
  },

  async rejectCommunity(id: string, remarks: string): Promise<any> {
    return await apiFetch<any>(`/communities/${id}/reject/`, {
      method: "POST",
      body: JSON.stringify({ remarks })
    });
  },

  async deleteCommunity(id: string): Promise<any> {
    return await apiFetch<any>(`/communities/${id}/`, {
      method: "DELETE"
    });
  },

  async getApprovalHistory(): Promise<any[]> {
    try {
      return await apiFetch<any[]>("/approval-history/");
    } catch (e) {
      console.warn("Failed to get approval history", e);
      return [];
    }
  },

  async getNotifications(): Promise<any[]> {
    try {
      return await apiFetch<any[]>("/notifications/");
    } catch (e) {
      console.warn("Failed to get notifications", e);
      return [];
    }
  },

  async markAllNotificationsRead(): Promise<any> {
    try {
      return await apiFetch<any>("/notifications/mark_all_as_read/", {
        method: "POST"
      });
    } catch (e) {
      console.warn("Failed to mark notifications read", e);
    }
  },

  async deleteNotification(id: string | number): Promise<void> {
    try {
      await apiFetch<void>(`/notifications/${id}/`, {
        method: "DELETE"
      });
    } catch (e) {
      console.error("Failed to delete notification", e);
      throw e;
    }
  },

  async deleteAllNotifications(): Promise<void> {
    try {
      await apiFetch<void>("/notifications/delete_all/", {
        method: "DELETE"
      });
    } catch (e) {
      console.error("Failed to delete all notifications", e);
      throw e;
    }
  },

  // Events
  async getEvents(filters?: any): Promise<any[]> {
    try {
      const query = new URLSearchParams(filters || {}).toString();
      const endpoint = query ? `/events/?${query}` : "/events/";
      return await apiFetch<any[]>(endpoint);
    } catch (e) {
      console.warn("Django API failed, falling back to mock EVENTS", e);
      return EVENTS;
    }
  },

  async getEvent(id: string): Promise<any> {
    try {
      return await apiFetch<any>(`/events/${id}/`);
    } catch (e) {
      console.warn(`Failed to get event ${id}`, e);
      return EVENTS.find((e: any) => e.id === parseInt(id));
    }
  },

  async getUpcomingEvents(): Promise<any[]> {
    try {
      return await apiFetch<any[]>("/events/upcoming/");
    } catch (e) {
      console.warn("Failed to get upcoming events", e);
      return EVENTS.filter((e: any) => e.upcoming);
    }
  },

  async createEvent(data: any): Promise<any> {
    let body: any = JSON.stringify(data);
    if (data instanceof FormData) {
      body = data;
    } else {
      const hasFile = Object.values(data).some(val => val instanceof File || val instanceof Blob);
      if (hasFile) {
        const formData = new FormData();
        for (const [key, val] of Object.entries(data)) {
          if (val === null) {
            formData.append(key, "");
          } else if (val instanceof File || val instanceof Blob) {
            formData.append(key, val);
          } else if (typeof val === "object") {
            formData.append(key, JSON.stringify(val));
          } else if (val !== undefined) {
            formData.append(key, String(val));
          }
        }
        body = formData;
      }
    }
    try {
      return await apiFetch<any>("/events/", {
        method: "POST",
        body,
      });
    } catch (e) {
      console.error("Failed to create event", e);
      throw e;
    }
  },

  async updateEvent(id: string | number, data: any): Promise<any> {
    let body: any = JSON.stringify(data);
    if (data instanceof FormData) {
      body = data;
    } else {
      const hasFile = Object.values(data).some(val => val instanceof File || val instanceof Blob);
      if (hasFile) {
        const formData = new FormData();
        for (const [key, val] of Object.entries(data)) {
          if (val === null) {
            formData.append(key, "");
          } else if (val instanceof File || val instanceof Blob) {
            formData.append(key, val);
          } else if (typeof val === "object") {
            formData.append(key, JSON.stringify(val));
          } else if (val !== undefined) {
            formData.append(key, String(val));
          }
        }
        body = formData;
      }
    }
    try {
      return await apiFetch<any>(`/events/${id}/`, {
        method: "PATCH",
        body,
      });
    } catch (e) {
      console.error("Failed to update event", e);
      throw e;
    }
  },

  // Event Registrations
  async getEventRegistrations(filters?: any): Promise<any[]> {
    try {
      const query = new URLSearchParams(filters || {}).toString();
      const endpoint = query ? `/event-registrations/?${query}` : "/event-registrations/";
      return await apiFetch<any[]>(endpoint);
    } catch (e) {
      console.warn("Failed to get event registrations", e);
      return [];
    }
  },

  async createEventRegistration(data: any): Promise<any> {
    try {
      return await apiFetch<any>("/event-registrations/", {
        method: "POST",
        body: JSON.stringify(data),
      });
    } catch (e) {
      console.error("Failed to create event registration", e);
      throw e;
    }
  },

  async updateEventRegistration(id: string | number, data: any): Promise<any> {
    try {
      return await apiFetch<any>(`/event-registrations/${id}/`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    } catch (e) {
      console.error("Failed to update event registration", e);
      throw e;
    }
  },

  async deleteEventRegistration(id: string | number): Promise<void> {
    try {
      await apiFetch<void>(`/event-registrations/${id}/`, {
        method: "DELETE",
      });
    } catch (e) {
      console.error("Failed to delete event registration", e);
      throw e;
    }
  },

  // Jobs
  async getJobs(filters?: any): Promise<any[]> {
    try {
      const query = new URLSearchParams(filters || {}).toString();
      const endpoint = query ? `/jobs/?${query}` : "/jobs/";
      return await apiFetch<any[]>(endpoint);
    } catch (e) {
      console.warn("Django API failed, falling back to mock JOBS", e);
      return JOBS;
    }
  },

  async getJob(id: string): Promise<any> {
    try {
      return await apiFetch<any>(`/jobs/${id}/`);
    } catch (e) {
      console.warn(`Failed to get job ${id}`, e);
      return JOBS.find((j: any) => j.id === parseInt(id));
    }
  },

  async createJob(data: any): Promise<any> {
    try {
      return await apiFetch<any>("/jobs/", {
        method: "POST",
        body: JSON.stringify(data),
      });
    } catch (e) {
      console.error("Failed to create job", e);
      throw e;
    }
  },

  async updateJob(id: string | number, data: any): Promise<any> {
    return await apiFetch<any>(`/jobs/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async deleteJob(id: string | number): Promise<void> {
    await apiFetch<void>(`/jobs/${id}/`, { method: "DELETE" });
  },

  // Job Applications
  async getJobApplications(filters?: any): Promise<any[]> {
    try {
      const query = new URLSearchParams(filters || {}).toString();
      const endpoint = query ? `/job-applications/?${query}` : "/job-applications/";
      return await apiFetch<any[]>(endpoint);
    } catch (e) {
      console.warn("Failed to get job applications", e);
      return [];
    }
  },

  async createJobApplication(data: FormData): Promise<any> {
    return await apiFetch<any>("/job-applications/", {
      method: "POST",
      body: data,
    });
  },

  async updateJobApplication(id: string | number, data: any): Promise<any> {
    const isFormData = data instanceof FormData;
    return await apiFetch<any>(`/job-applications/${id}/`, {
      method: "PATCH",
      body: isFormData ? data : JSON.stringify(data),
      headers: isFormData ? {} : { "Content-Type": "application/json" }
    });
  },

  async deleteJobApplication(id: string | number): Promise<void> {
    await apiFetch<void>(`/job-applications/${id}/`, { method: "DELETE" });
  },

  // Businesses
  async getBusinesses(filters?: any): Promise<any[]> {
    try {
      const query = new URLSearchParams(filters || {}).toString();
      const endpoint = query ? `/businesses/?${query}` : "/businesses/";
      return await apiFetch<any[]>(endpoint);
    } catch (e) {
      console.warn("Django API failed, falling back to mock BUSINESSES", e);
      return BUSINESSES;
    }
  },

  async getBusiness(id: string): Promise<any> {
    try {
      return await apiFetch<any>(`/businesses/${id}/`);
    } catch (e) {
      console.warn(`Failed to get business ${id}`, e);
      return BUSINESSES.find((b: any) => b.id === parseInt(id));
    }
  },

  async createBusiness(data: any): Promise<any> {
    try {
      const isFormData = data instanceof FormData;
      return await apiFetch<any>("/businesses/", {
        method: "POST",
        body: isFormData ? data : JSON.stringify(data),
      });
    } catch (e) {
      console.error("Failed to create business", e);
      throw e;
    }
  },

  async updateBusiness(id: string | number, data: any): Promise<any> {
    const isFormData = data instanceof FormData;
    return await apiFetch<any>(`/businesses/${id}/`, {
      method: "PATCH",
      body: isFormData ? data : JSON.stringify(data),
    });
  },

  async deleteBusiness(id: string | number): Promise<void> {
    await apiFetch<void>(`/businesses/${id}/`, { method: "DELETE" });
  },

  async trackBusinessClick(id: string | number, clickType: string): Promise<any> {
    try {
      return await apiFetch<any>(`/businesses/${id}/track-click/`, {
        method: "POST",
        body: JSON.stringify({ click_type: clickType }),
      });
    } catch (e) {
      console.warn(`Failed to track click for business ${id}`, e);
      return null;
    }
  },

  // Matrimony compatibility aliases
  async getMatrimony(filters?: any): Promise<any[]> {
    return this.getMatrimonyProfiles(filters);
  },
  async showInterest(profileId: string | number): Promise<any> {
    return this.showMatrimonyInterest(profileId);
  },
  async acceptInterest(interestId: string | number): Promise<any> {
    return this.acceptMatrimonyInterest(Number(interestId));
  },
  async rejectInterest(interestId: string | number): Promise<any> {
    return this.rejectMatrimonyInterest(Number(interestId));
  },
  async withdrawInterest(interestId: string | number): Promise<any> {
    return this.withdrawMatrimonyInterest(Number(interestId));
  },
  async toggleWishlist(profileId: string | number): Promise<any> {
    return this.toggleMatrimonyWishlist(profileId);
  },
  async getMyWishlist(): Promise<any[]> {
    return this.getMatrimonyWishlist();
  },
  async getInterestsReceived(): Promise<any[]> {
    return this.getMatrimonyInterestsReceived();
  },
  async getInterestsSent(): Promise<any[]> {
    return this.getMatrimonyInterestsSent();
  },
  async recordProfileView(profileId: string | number): Promise<any> {
    return this.recordMatrimonyProfileView(profileId);
  },


  // News
  async getNews(filters?: any): Promise<any[]> {
    try {
      const query = new URLSearchParams(filters || {}).toString();
      const endpoint = query ? `/news/?${query}` : "/news/";
      return await apiFetch<any[]>(endpoint);
    } catch (e) {
      console.warn("Django API failed, falling back to mock NEWS", e);
      return NEWS;
    }
  },

  async getNewsArticle(id: string): Promise<any> {
    try {
      return await apiFetch<any>(`/news/${id}/`);
    } catch (e) {
      console.warn(`Failed to get news ${id}`, e);
      return NEWS.find((n: any) => n.id === parseInt(id));
    }
  },

  async createNews(data: any): Promise<any> {
    let body: any = JSON.stringify(data);
    if (data instanceof FormData) body = data;
    else if (Object.values(data).some(val => val instanceof File || val instanceof Blob)) {
      const formData = new FormData();
      for (const [key, val] of Object.entries(data)) {
        if (val === null) formData.append(key, "");
        else if (val !== undefined) formData.append(key, val as any);
      }
      body = formData;
    }
    return await apiFetch<any>("/news/", { method: "POST", body });
  },

  async updateNews(id: string | number, data: any): Promise<any> {
    let body: any = JSON.stringify(data);
    if (data instanceof FormData) body = data;
    else if (Object.values(data).some(val => val instanceof File || val instanceof Blob)) {
      const formData = new FormData();
      for (const [key, val] of Object.entries(data)) {
        if (val === null) formData.append(key, "");
        else if (val !== undefined) formData.append(key, val as any);
      }
      body = formData;
    }
    return await apiFetch<any>(`/news/${id}/`, { method: "PATCH", body });
  },

  async deleteNews(id: string | number): Promise<void> {
    await apiFetch<void>(`/news/${id}/`, { method: "DELETE" });
  },

  async deleteEvent(id: string | number): Promise<void> {
    await apiFetch<void>(`/events/${id}/`, { method: "DELETE" });
  },

  // Donations
  async getDonations(filters?: any): Promise<any[]> {
    try {
      const query = new URLSearchParams(filters || {}).toString();
      const endpoint = query ? `/donations/?${query}` : "/donations/";
      return await apiFetch<any[]>(endpoint);
    } catch (e) {
      console.warn("Django API failed, falling back to mock DONATIONS", e);
      return DONATIONS;
    }
  },

  async createDonation(data: any): Promise<any> {
    try {
      return await apiFetch<any>("/donations/", {
        method: "POST",
        body: JSON.stringify(data),
      });
    } catch (e) {
      console.error("Failed to create donation", e);
      throw e;
    }
  },

  async deleteDonation(id: string | number): Promise<void> {
    await apiFetch<void>(`/donations/${id}/`, { method: "DELETE" });
  },

  // Campaigns
  async getCampaigns(filters?: any): Promise<any[]> {
    try {
      const query = new URLSearchParams(filters || {}).toString();
      const endpoint = query ? `/campaigns/?${query}` : "/campaigns/";
      return await apiFetch<any[]>(endpoint);
    } catch (e) {
      console.warn("Django API failed, falling back to mock CAMPAIGNS", e);
      return CAMPAIGNS;
    }
  },

  async createCampaign(data: any): Promise<any> {
    let body: any = JSON.stringify(data);
    if (data instanceof FormData) body = data;
    else if (Object.values(data).some(val => val instanceof File || val instanceof Blob)) {
      const formData = new FormData();
      for (const [key, val] of Object.entries(data)) {
        if (val === null) formData.append(key, "");
        else if (val !== undefined) formData.append(key, val as any);
      }
      body = formData;
    }
    return await apiFetch<any>("/campaigns/", { method: "POST", body });
  },

  async updateCampaign(id: string | number, data: any): Promise<any> {
    let body: any = JSON.stringify(data);
    if (data instanceof FormData) body = data;
    else if (Object.values(data).some(val => val instanceof File || val instanceof Blob)) {
      const formData = new FormData();
      for (const [key, val] of Object.entries(data)) {
        if (val === null) formData.append(key, "");
        else if (val !== undefined) formData.append(key, val as any);
      }
      body = formData;
    }
    return await apiFetch<any>(`/campaigns/${id}/`, { method: "PATCH", body });
  },

  async deleteCampaign(id: string | number): Promise<void> {
    await apiFetch<void>(`/campaigns/${id}/`, { method: "DELETE" });
  },

  // Members
  async getMembers(filters?: any): Promise<any[]> {
    try {
      const query = new URLSearchParams(filters || {}).toString();
      const endpoint = query ? `/members/?${query}` : "/members/";
      return await apiFetch<any[]>(endpoint);
    } catch (e) {
      console.warn("Django API failed, falling back to mock MEMBERS", e);
      return MEMBERS;
    }
  },

  async getMember(id: string | number): Promise<any> {
    try {
      return await apiFetch<any>(`/members/${id}/`, { cache: "no-store" });
    } catch (e) {
      console.warn(`Failed to get member ${id}, falling back to mock`, e);
      return MEMBERS.find((m: any) => m.id === Number(id));
    }
  },

  async updateMember(memberId: string, data: any): Promise<any> {
    try {
      return await apiFetch<any>(`/members/${memberId}/`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    } catch (e) {
      console.error(`Failed to update member for ${memberId}`, e);
      throw e;
    }
  },

  async updateMemberStatus(memberId: string, status: string): Promise<any> {
    return this.updateMember(memberId, { status });
  },

  // Families
  async getFamilies(communityId?: string): Promise<any[]> {
    try {
      const q = communityId ? `?communityId=${communityId}` : "";
      return await apiFetch<any[]>(`/families/${q}`);
    } catch (e) {
      console.warn("Django API failed, falling back to mock FAMILIES", e);
      return FAMILIES;
    }
  },

  // Committee
  async getCommittee(filters?: any): Promise<any[]> {
    try {
      const query = new URLSearchParams(filters || {}).toString();
      const endpoint = query ? `/committee/?${query}` : "/committee/";
      return await apiFetch<any[]>(endpoint);
    } catch (e) {
      console.warn("Django API failed, falling back to mock COMMITTEE", e);
      return COMMITTEE;
    }
  },

  async createCommitteeMember(data: any): Promise<any> {
    try {
      return await apiFetch<any>("/committee/", {
        method: "POST",
        body: JSON.stringify(data),
      });
    } catch (e) {
      console.error("Failed to create committee member", e);
      throw e;
    }
  },

  async updateCommitteeMember(id: string | number, data: any): Promise<any> {
    return await apiFetch<any>(`/committee/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async deleteCommitteeMember(id: string | number): Promise<void> {
    await apiFetch<void>(`/committee/${id}/`, { method: "DELETE" });
  },

  // Family
  async getMyFamilies(): Promise<any[]> {
    try {
      return await apiFetch<any[]>("/families/");
    } catch (e) {
      console.warn("Failed to get families", e);
      return [];
    }
  },

  async createFamily(data: any): Promise<any> {
    return await apiFetch<any>("/families/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async deleteFamily(id: number): Promise<void> {
    await apiFetch<void>(`/families/${id}/`, { method: "DELETE" });
  },

  async addFamilyMember(data: any): Promise<any> {
    return await apiFetch<any>("/family-members/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async deleteFamilyMember(id: number): Promise<void> {
    await apiFetch<void>(`/family-members/${id}/`, { method: "DELETE" });
  },

  async updateFamilyMember(id: number, data: any): Promise<any> {
    return await apiFetch<any>(`/family-members/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  // Subscriptions
  async getPlans(): Promise<any[]> {
    try {
      return await apiFetch<any[]>("/plans/");
    } catch (e) {
      console.warn("Failed to get plans", e);
      return [];
    }
  },
  async createPlan(data: any): Promise<any> {
    return await apiFetch<any>("/plans/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  async updatePlan(id: string | number, data: any): Promise<any> {
    return await apiFetch<any>(`/plans/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },
  async deletePlan(id: string | number): Promise<void> {
    await apiFetch<void>(`/plans/${id}/`, { method: "DELETE" });
  },
  async clonePlan(id: string | number, name?: string, code?: string): Promise<any> {
    return await apiFetch<any>(`/plans/${id}/clone/`, {
      method: "POST",
      body: JSON.stringify({ name, code })
    });
  },
  async archivePlan(id: string | number): Promise<any> {
    return await apiFetch<any>(`/plans/${id}/archive/`, {
      method: "POST"
    });
  },
  async updatePlanPermissions(id: string | number, permissions: any[]): Promise<any> {
    return await apiFetch<any>(`/plans/${id}/permissions/`, {
      method: "POST",
      body: JSON.stringify({ permissions })
    });
  },
  async getFeatures(): Promise<any[]> {
    return await apiFetch<any[]>("/features/");
  },
  async scanFeatures(): Promise<any> {
    return await apiFetch<any>("/features/scan/", { method: "POST" });
  },

  async cancelPlan(id: string | number): Promise<any> {
    return await apiFetch<any>(`/community-subscriptions/${id}/cancel/`, {
      method: "POST"
    });
  },
  async getSubscriptionUsage(id: string | number): Promise<any[]> {
    return await apiFetch<any[]>(`/community-subscriptions/${id}/usage/`);
  },

  async createPlanAddon(data: any): Promise<any> {
    return await apiFetch<any>("/plan-addons/", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },
  async updatePlanAddon(id: string | number, data: any): Promise<any> {
    return await apiFetch<any>(`/plan-addons/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(data)
    });
  },
  async deletePlanAddon(id: string | number): Promise<void> {
    await apiFetch<void>(`/plan-addons/${id}/`, { method: "DELETE" });
  },


  // Roles
  async getRoles(): Promise<any[]> {
    try {
      return await apiFetch<any[]>("/roles/");
    } catch (e) {
      console.warn("Failed to get roles", e);
      return [];
    }
  },
  async createRole(data: any): Promise<any> {
    return await apiFetch<any>("/roles/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  async updateRole(id: string | number, data: any): Promise<any> {
    return await apiFetch<any>(`/roles/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },
  async deleteRole(id: string | number): Promise<void> {
    await apiFetch<void>(`/roles/${id}/`, { method: "DELETE" });
  },

  // Advertisements
  async getAdvertisements(filters?: any): Promise<any[]> {
    try {
      const query = new URLSearchParams(filters || {}).toString();
      const endpoint = query ? `/advertisements/?${query}` : "/advertisements/";
      return await apiFetch<any[]>(endpoint);
    } catch (e) {
      console.warn("Failed to get advertisements", e);
      return [];
    }
  },
  async createAdvertisement(data: any): Promise<any> {
    let body: any = JSON.stringify(data);
    if (data instanceof FormData) {
      body = data;
    } else {
      const hasFile = Object.values(data).some(val => val instanceof File || val instanceof Blob);
      if (hasFile) {
        const formData = new FormData();
        for (const [key, val] of Object.entries(data)) {
          if (val !== null && val !== undefined) {
            formData.append(key, val as any);
          }
        }
        body = formData;
      }
    }
    return await apiFetch<any>("/advertisements/", {
      method: "POST",
      body,
    });
  },
  async updateAdvertisement(id: string | number, data: any): Promise<any> {
    let body: any = JSON.stringify(data);
    if (data instanceof FormData) {
      body = data;
    } else {
      const hasFile = Object.values(data).some(val => val instanceof File || val instanceof Blob);
      if (hasFile) {
        const formData = new FormData();
        for (const [key, val] of Object.entries(data)) {
          if (val !== null && val !== undefined) {
            formData.append(key, val as any);
          }
        }
        body = formData;
      }
    }
    return await apiFetch<any>(`/advertisements/${id}/`, {
      method: "PATCH",
      body,
    });
  },
  async deleteAdvertisement(id: string | number): Promise<void> {
    await apiFetch<void>(`/advertisements/${id}/`, {
      method: "DELETE",
    });
  },

  // Matrimony Module API Helpers
  async getMatrimonyProfiles(filters?: any): Promise<any[]> {
    try {
      const query = new URLSearchParams(filters || {}).toString();
      const endpoint = query ? `/matrimony-profiles/?${query}` : "/matrimony-profiles/";
      return await apiFetch<any[]>(endpoint, { cache: "no-store" });
    } catch (e) {
      console.warn("Django API failed, returning empty profiles", e);
      return [];
    }
  },

  async getMatrimonyProfile(id: string | number): Promise<any> {
    return await apiFetch<any>(`/matrimony-profiles/${id}/`, { cache: "no-store" });
  },

  async getMyProfiles(): Promise<any[]> {
    try {
      return await apiFetch<any[]>("/matrimony-profiles/my-profiles/", { cache: "no-store" });
    } catch (e) {
      console.warn("Failed to fetch my profiles", e);
      return [];
    }
  },

  async getMyProfile(profileId?: string | number): Promise<any> {
    const q = profileId ? `?profile_id=${profileId}` : "";
    return await apiFetch<any>(`/matrimony-profiles/my-profile/${q}`, { cache: "no-store" });
  },

  async createMatrimonyProfile(data: any): Promise<any> {
    const hasFile = Object.values(data).some(val => val instanceof File);
    if (hasFile) {
      const formData = new FormData();
      Object.entries(data).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          if (val instanceof File) {
            formData.append(key, val);
          } else if (Array.isArray(val)) {
            val.forEach(item => {
              formData.append(key, String(item));
            });
          } else {
            formData.append(key, String(val));
          }
        }
      });
      return await apiFetch<any>("/matrimony-profiles/my-profile/", {
        method: "POST",
        body: formData
      });
    }
    return await apiFetch<any>("/matrimony-profiles/my-profile/", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  async updateMatrimonyProfile(data: any, profileId?: string | number): Promise<any> {
    const q = profileId ? `?profile_id=${profileId}` : "";
    return await apiFetch<any>(`/matrimony-profiles/my-profile/${q}`, {
      method: "PATCH",
      body: JSON.stringify(data)
    });
  },

  async estimateReach(data: any): Promise<any> {
    return await apiFetch<any>("/matrimony-profiles/estimate-reach/", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  async getAvailableFamilyMembers(): Promise<any[]> {
    try {
      return await apiFetch<any[]>("/matrimony-profiles/family-members/", { cache: "no-store" });
    } catch (e) {
      console.error("Failed to fetch family members", e);
      return [];
    }
  },

  async getMatrimonyPreferences(profileId?: string | number): Promise<any> {
    const q = profileId ? `?profile_id=${profileId}` : "";
    return await apiFetch<any>(`/matrimony-profiles/preferences/${q}`, { cache: "no-store" });
  },

  async updateMatrimonyPreferences(data: any, profileId?: string | number): Promise<any> {
    const q = profileId ? `?profile_id=${profileId}` : "";
    return await apiFetch<any>(`/matrimony-profiles/preferences/${q}`, {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  async getMatrimonyVisibility(): Promise<any> {
    return await apiFetch<any>("/matrimony-profiles/visibility/", { cache: "no-store" });
  },

  async updateMatrimonyVisibility(data: any): Promise<any> {
    return await apiFetch<any>("/matrimony-profiles/visibility/", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  async uploadMatrimonyPhoto(profileId: string | number, file: File, category = "Profile Photo", isPrivate = false): Promise<any> {
    const formData = new FormData();
    formData.append("image", file);
    formData.append("category", category);
    formData.append("is_private", String(isPrivate));
    return await apiFetch<any>(`/matrimony-profiles/${profileId}/upload-photo/`, {
      method: "POST",
      body: formData
    });
  },

  async deleteMatrimonyPhoto(profileId: string | number, photoId: number): Promise<any> {
    return await apiFetch<any>(`/matrimony-profiles/${profileId}/delete-photo/`, {
      method: "POST",
      body: JSON.stringify({ photo_id: photoId })
    });
  },

  async updateMatrimonyPhoto(profileId: string | number, photoId: number, category?: string, isPrivate?: boolean): Promise<any> {
    return await apiFetch<any>(`/matrimony-profiles/${profileId}/update-photo/`, {
      method: "POST",
      body: JSON.stringify({ photo_id: photoId, category, is_private: isPrivate })
    });
  },

  async setPrimaryPhoto(profileId: string | number, photoId: number): Promise<any> {
    return await apiFetch<any>(`/matrimony-profiles/${profileId}/set-primary-photo/`, {
      method: "POST",
      body: JSON.stringify({ photo_id: photoId })
    });
  },

  async reorderMatrimonyPhotos(profileId: string | number, photoIds: number[]): Promise<any> {
    return await apiFetch<any>(`/matrimony-profiles/${profileId}/reorder-photos/`, {
      method: "POST",
      body: JSON.stringify({ photo_ids: photoIds })
    });
  },

  async showMatrimonyInterest(profileId: string | number): Promise<any> {
    return await apiFetch<any>(`/matrimony-profiles/${profileId}/show-interest/`, {
      method: "POST"
    });
  },

  async acceptMatrimonyInterest(interestId: number): Promise<any> {
    return await apiFetch<any>(`/matrimony-profiles/${interestId}/accept-interest/`, {
      method: "POST"
    });
  },

  async rejectMatrimonyInterest(interestId: number): Promise<any> {
    return await apiFetch<any>(`/matrimony-profiles/${interestId}/reject-interest/`, {
      method: "POST"
    });
  },

  async withdrawMatrimonyInterest(interestId: number): Promise<any> {
    return await apiFetch<any>(`/matrimony-profiles/${interestId}/withdraw-interest/`, {
      method: "POST"
    });
  },

  async toggleMatrimonyWishlist(profileId: string | number): Promise<any> {
    return await apiFetch<any>(`/matrimony-profiles/${profileId}/wishlist/`, {
      method: "POST"
    });
  },

  async getMatrimonyWishlist(): Promise<any[]> {
    try {
      return await apiFetch<any[]>("/matrimony-profiles/my-wishlist/", { cache: "no-store" });
    } catch (e) {
      console.warn("Failed to fetch wishlist", e);
      return [];
    }
  },

  async getMatrimonyInterestsReceived(): Promise<any[]> {
    try {
      return await apiFetch<any[]>("/matrimony-profiles/interests-received/", { cache: "no-store" });
    } catch (e) {
      console.warn("Failed to fetch interests received", e);
      return [];
    }
  },

  async getMatrimonyInterestsSent(): Promise<any[]> {
    try {
      return await apiFetch<any[]>("/matrimony-profiles/interests-sent/", { cache: "no-store" });
    } catch (e) {
      console.warn("Failed to fetch interests sent", e);
      return [];
    }
  },

  async recordMatrimonyProfileView(profileId: string | number): Promise<any> {
    return await apiFetch<any>(`/matrimony-profiles/${profileId}/record-view/`, {
      method: "POST"
    });
  },

  async getMatrimonyAnalytics(profileId?: string | number): Promise<any> {
    const q = profileId ? `?profile_id=${profileId}` : "";
    return await apiFetch<any>(`/matrimony-profiles/analytics/${q}`, { cache: "no-store" });
  },

  async getMatrimonyMatches(profileId?: string | number, params?: any): Promise<any[]> {
    try {
      const queryParams = new URLSearchParams();
      if (profileId) {
        queryParams.append("profile_id", String(profileId));
      }
      if (params) {
        Object.entries(params).forEach(([key, val]) => {
          if (val !== undefined && val !== null && val !== "") {
            queryParams.append(key, String(val));
          }
        });
      }
      const q = queryParams.toString() ? `?${queryParams.toString()}` : "";
      return await apiFetch<any[]>(`/matrimony-profiles/matches/${q}`, { cache: "no-store" });
    } catch (e) {
      console.warn("Failed to get matches", e);
      return [];
    }
  },

  async softDeleteMatrimonyProfile(profileId: string | number): Promise<void> {
    await apiFetch<void>(`/matrimony-profiles/${profileId}/`, {
      method: "DELETE"
    });
  },
  async deleteMatrimonyProfile(profileId: string | number): Promise<void> {
    return this.softDeleteMatrimonyProfile(profileId);
  },

  async verifyMatrimonyProfile(profileId: string | number): Promise<any> {
    return await apiFetch<any>(`/matrimony-profiles/${profileId}/verify/`, {
      method: "POST"
    });
  },

  async suspendMatrimonyProfile(profileId: string | number): Promise<any> {
    return await apiFetch<any>(`/matrimony-profiles/${profileId}/suspend/`, {
      method: "POST"
    });
  },

  async setPrimaryMatrimonyPhoto(profileId: string | number, photoId: string | number): Promise<any> {
    return await apiFetch<any>(`/matrimony-profiles/${profileId}/set-primary-photo/`, {
      method: "POST",
      body: JSON.stringify({ photo_id: photoId })
    });
  },


  async getMatrimonyAuditLogs(profileId: string | number): Promise<any[]> {
    try {
      return await apiFetch<any[]>(`/matrimony-profiles/${profileId}/audit-logs/`, { cache: "no-store" });
    } catch (e) {
      console.warn("Failed to get audit logs", e);
      return [];
    }
  },
  async getMatrimonyAdminStats(communityId?: string | number): Promise<any> {
    const q = communityId ? `?community_id=${communityId}` : "";
    return await apiFetch<any>(`/matrimony-profiles/admin-stats/${q}`, { cache: "no-store" });
  },

  async adminUpdateMatrimonyProfile(profileId: string | number, data: any): Promise<any> {
    return await apiFetch<any>(`/matrimony-profiles/${profileId}/`, {
      method: "PATCH",
      body: JSON.stringify(data)
    });
  },

  async getAncestorCommunityIds(currentCommunityId: number | string): Promise<number[]> {
    const ids: number[] = [Number(currentCommunityId)];
    if (!currentCommunityId) return ids;
    try {
      const allCommunities = await this.getCommunities();
      let current = allCommunities.find((c: any) => Number(c.id) === Number(currentCommunityId));
      while (current && current.parent) {
        const parentId = Number(current.parent);
        if (ids.includes(parentId)) break; // avoid loops
        ids.push(parentId);
        current = allCommunities.find((c: any) => Number(c.id) === parentId);
      }
    } catch (e) {
      console.warn("Failed to walk ancestor communities chain", e);
    }
    return ids;
  },

  // Message requests & Chat endpoints
  async getMessageRequests(role?: string, status?: string): Promise<any[]> {
    const params = new URLSearchParams();
    if (role) params.append('role', role);
    if (status) params.append('status', status);
    const queryStr = params.toString() ? `?${params.toString()}` : '';
    return await apiFetch<any[]>(`/message-requests/${queryStr}`);
  },

  async createMessageRequest(data: { receiver: number; subject?: string; introduction_message: string; reason: string; custom_reason?: string }): Promise<any> {
    return await apiFetch<any>('/message-requests/', {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  async approveMessageRequest(requestId: number | string): Promise<any> {
    return await apiFetch<any>(`/message-requests/${requestId}/approve/`, {
      method: "POST"
    });
  },

  async rejectMessageRequest(requestId: number | string): Promise<any> {
    return await apiFetch<any>(`/message-requests/${requestId}/reject/`, {
      method: "POST"
    });
  },

  async getConversations(): Promise<any[]> {
    return await apiFetch<any[]>('/conversations/');
  },

  async getConversationMessages(conversationId: number | string): Promise<any[]> {
    return await apiFetch<any[]>(`/conversations/${conversationId}/messages/`);
  },

  async sendMessage(conversationId: number | string, content: string, image?: File | null, fileAttachment?: File | null, replyToMessageId?: number | null): Promise<any> {
    if (image || fileAttachment) {
      const formData = new FormData();
      formData.append('conversation', String(conversationId));
      formData.append('content', content);
      if (image) formData.append('image', image);
      if (fileAttachment) formData.append('file', fileAttachment);
      if (replyToMessageId) formData.append('reply_to_id', String(replyToMessageId));
      return await apiFetch<any>('/messages/', {
        method: "POST",
        body: formData
      });
    }
    const payload: any = {
      conversation: conversationId,
      content
    };
    if (replyToMessageId) {
      payload.reply_to_id = replyToMessageId;
    }
    return await apiFetch<any>('/messages/', {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  async reactToMessage(messageId: number | string, emoji: string | null): Promise<any> {
    return await apiFetch<any>(`/messages/${messageId}/react/`, {
      method: "POST",
      body: JSON.stringify({ emoji })
    });
  },

  async deleteMessage(messageId: number | string): Promise<any> {
    return await apiFetch<any>(`/messages/${messageId}/`, {
      method: "DELETE"
    });
  },

  // --- VENUE BOOKING & PROPERTY MANAGEMENT ---
  async getBookingProperties(communityId?: string | number): Promise<any[]> {
    const q = communityId ? `?community=${communityId}` : "";
    return await apiFetch<any[]>(`/booking-properties/${q}`);
  },
  async createBookingProperty(data: any): Promise<any> {
    let body: any = JSON.stringify(data);
    if (data instanceof FormData) body = data;
    else if (Object.values(data).some(val => val instanceof File || val instanceof Blob || (Array.isArray(val) && val.some(v => v instanceof File || v instanceof Blob)))) {
      const formData = new FormData();
      for (const [key, val] of Object.entries(data)) {
        if (val === null) formData.append(key, "");
        else if (Array.isArray(val)) {
          if (val.some(v => v instanceof File || v instanceof Blob)) {
            val.forEach(v => formData.append(key, v as any));
          } else {
            formData.append(key, JSON.stringify(val));
          }
        }
        else if (val !== undefined) formData.append(key, val as any);
      }
      body = formData;
    }
    return await apiFetch<any>('/booking-properties/', { method: 'POST', body });
  },
  async updateBookingProperty(id: number | string, data: any): Promise<any> {
    let body: any = JSON.stringify(data);
    if (data instanceof FormData) body = data;
    else if (Object.values(data).some(val => val instanceof File || val instanceof Blob || (Array.isArray(val) && val.some(v => v instanceof File || v instanceof Blob)))) {
      const formData = new FormData();
      for (const [key, val] of Object.entries(data)) {
        if (val === null) formData.append(key, "");
        else if (Array.isArray(val)) {
          if (val.some(v => v instanceof File || v instanceof Blob)) {
            val.forEach(v => formData.append(key, v as any));
          } else {
            formData.append(key, JSON.stringify(val));
          }
        }
        else if (val !== undefined) formData.append(key, val as any);
      }
      body = formData;
    }
    return await apiFetch<any>(`/booking-properties/${id}/`, { method: 'PATCH', body });
  },
  async getPropertyResources(): Promise<any[]> {
    return await apiFetch<any[]>('/property-resources/');
  },
  async createPropertyResource(data: any): Promise<any> {
    return await apiFetch<any>('/property-resources/', { method: 'POST', body: JSON.stringify(data) });
  },
  async updatePropertyResource(id: number | string, data: any): Promise<any> {
    return await apiFetch<any>(`/property-resources/${id}/`, { method: 'PATCH', body: JSON.stringify(data) });
  },
  async getResourcePricing(): Promise<any[]> {
    return await apiFetch<any[]>('/resource-pricing/');
  },
  async createResourcePricing(data: any): Promise<any> {
    return await apiFetch<any>('/resource-pricing/', { method: 'POST', body: JSON.stringify(data) });
  },
  async updateResourcePricing(id: number | string, data: any): Promise<any> {
    return await apiFetch<any>(`/resource-pricing/${id}/`, { method: 'PATCH', body: JSON.stringify(data) });
  },
  async getVenueBookings(): Promise<any[]> {
    return await apiFetch<any[]>('/venue-bookings/');
  },
  async createVenueBooking(data: any): Promise<any> {
    const isFormData = data instanceof FormData;
    return await apiFetch<any>('/venue-bookings/', { 
      method: 'POST', 
      body: isFormData ? data : JSON.stringify(data) 
    });
  },
  async updateVenueBooking(id: number | string, data: any): Promise<any> {
    const isFormData = data instanceof FormData;
    return await apiFetch<any>(`/venue-bookings/${id}/`, { 
      method: 'PATCH', 
      body: isFormData ? data : JSON.stringify(data) 
    });
  },
  async verifyVenuePayment(bookingId: number | string): Promise<any> {
    return await apiFetch<any>(`/venue-bookings/${bookingId}/verify_payment/`, { method: 'POST' });
  },
  async checkInVenueBooking(bookingId: number | string): Promise<any> {
    return await apiFetch<any>(`/venue-bookings/${bookingId}/check_in/`, { method: 'POST' });
  },
  async completeVenueBooking(bookingId: number | string): Promise<any> {
    return await apiFetch<any>(`/venue-bookings/${bookingId}/complete/`, { method: 'POST' });
  },
  async getBookingInspections(): Promise<any[]> {
    return await apiFetch<any[]>('/booking-inspections/');
  },
  async createBookingInspection(data: any): Promise<any> {
    return await apiFetch<any>('/booking-inspections/', { method: 'POST', body: JSON.stringify(data) });
  },
  async updateBookingInspection(id: number | string, data: any): Promise<any> {
    return await apiFetch<any>(`/booking-inspections/${id}/`, { method: 'PATCH', body: JSON.stringify(data) });
  },
  async getBookingWaitingList(): Promise<any[]> {
    return await apiFetch<any[]>('/booking-waiting-list/');
  },
  async createBookingWaitingList(data: any): Promise<any> {
    return await apiFetch<any>('/booking-waiting-list/', { method: 'POST', body: JSON.stringify(data) });
  },
  async updateBookingWaitingList(id: number | string, data: any): Promise<any> {
    return await apiFetch<any>(`/booking-waiting-list/${id}/`, { method: 'PATCH', body: JSON.stringify(data) });
  },
  async deleteBookingWaitingList(id: number | string): Promise<any> {
    return await apiFetch<any>(`/booking-waiting-list/${id}/`, { method: 'DELETE' });
  },
  async checkPropertyAvailability(propertyId: number | string, data: any): Promise<any> {
    return await apiFetch<any>(`/booking-properties/${propertyId}/check_availability/`, { method: 'POST', body: JSON.stringify(data) });
  },
  async lockPropertyResource(data: any): Promise<any> {
    return await apiFetch<any>('/resource-locks/', { method: 'POST', body: JSON.stringify(data) });
  },
  async cancelVenueBooking(bookingId: number | string, data: any): Promise<any> {
    return await apiFetch<any>(`/venue-bookings/${bookingId}/request_cancellation/`, { method: 'POST', body: JSON.stringify(data) });
  },
  async approveBookingProperty(propertyId: number | string): Promise<any> {
    return await apiFetch<any>(`/booking-properties/${propertyId}/approve/`, { method: 'POST' });
  },
  async rejectBookingProperty(propertyId: number | string, data: any): Promise<any> {
    return await apiFetch<any>(`/booking-properties/${propertyId}/reject/`, { method: 'POST', body: JSON.stringify(data) });
  },
  async notifyBookingProperty(propertyId: number | string): Promise<any> {
    return await apiFetch<any>(`/booking-properties/${propertyId}/notify/`, { method: 'POST' });
  },
  async deleteBookingProperty(propertyId: number | string): Promise<any> {
    return await apiFetch<any>(`/booking-properties/${propertyId}/`, { method: 'DELETE' });
  },
  async deletePropertyResource(id: number | string): Promise<any> {
    return await apiFetch<any>(`/property-resources/${id}/`, { method: 'DELETE' });
  },
  async bulkCreatePropertyResources(data: any): Promise<any> {
    return await apiFetch<any>('/property-resources/bulk_create/', { method: 'POST', body: JSON.stringify(data) });
  },
  async createResourceDependency(data: any): Promise<any> {
    return await apiFetch<any>('/resource-dependencies/', { method: 'POST', body: JSON.stringify(data) });
  },
  async getResourceDependencies(): Promise<any> {
    return await apiFetch<any>('/resource-dependencies/');
  },
  async deleteResourceDependency(id: number | string): Promise<any> {
    return await apiFetch<any>(`/resource-dependencies/${id}/`, { method: 'DELETE' });
  },
  async getModules(params?: Record<string, string>): Promise<any[]> {
    const query = params ? "?" + new URLSearchParams(params).toString() : "";
    return await apiFetch<any[]>(`/modules/${query}`);
  },
  async getSidebarModules(): Promise<any[]> {
    return await apiFetch<any[]>("/modules/sidebar/");
  },
  async getSubscriptionModules(): Promise<any[]> {
    return await apiFetch<any[]>("/modules/subscription/");
  },
  async getPermissionModules(): Promise<any[]> {
    return await apiFetch<any[]>("/modules/permission/");
  },
  async getUsageModules(): Promise<any[]> {
    return await apiFetch<any[]>("/modules/usage/");
  },
  async getAnalyticsModules(): Promise<any[]> {
    return await apiFetch<any[]>("/modules/analytics/");
  },
  async createModule(data: any): Promise<any> {
    return await apiFetch<any>("/modules/", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },
  async updateModule(id: string | number, data: any): Promise<any> {
    return await apiFetch<any>(`/modules/${id}/`, {
      method: "PUT",
      body: JSON.stringify(data)
    });
  },
  async deleteModule(id: string | number): Promise<void> {
    return await apiFetch<void>(`/modules/${id}/`, {
      method: "DELETE"
    });
  },
  async activateModule(id: string | number): Promise<any> {
    return await apiFetch<any>(`/modules/${id}/activate/`, {
      method: "POST"
    });
  },
  async deactivateModule(id: string | number): Promise<any> {
    return await apiFetch<any>(`/modules/${id}/deactivate/`, {
      method: "POST"
    });
  },
  async archiveModule(id: string | number): Promise<any> {
    return await apiFetch<any>(`/modules/${id}/archive/`, {
      method: "POST"
    });
  },
  async cloneModule(id: string | number): Promise<any> {
    return await apiFetch<any>(`/modules/${id}/clone/`, {
      method: "POST"
    });
  },
  async bulkActivateModules(ids: any[]): Promise<any> {
    return await apiFetch<any>("/modules/bulk-activate/", {
      method: "POST",
      body: JSON.stringify({ ids })
    });
  },
  async bulkDeactivateModules(ids: any[]): Promise<any> {
    return await apiFetch<any>("/modules/bulk-deactivate/", {
      method: "POST",
      body: JSON.stringify({ ids })
    });
  },
  async bulkUpdateModules(updates: any[]): Promise<any> {
    return await apiFetch<any>("/modules/bulk-update/", {
      method: "POST",
      body: JSON.stringify({ updates })
    });
  },
  async scanModules(): Promise<any> {
    return await apiFetch<any>("/modules/scan/", {
      method: "POST"
    });
  },
  // ─── COMMUNITY SUBSCRIPTION ENGINE (Phase 3.2) ────────────────────────────
  // Plans & Core Subscription
  async getMyPlan(): Promise<any> {
    return await apiFetch<any>("/community-subscriptions/my-plan/");
  },
  async getCommunitySubscriptions(): Promise<any[]> {
    try { return await apiFetch<any[]>("/community-subscriptions/"); } catch { return []; }
  },
  async assignPlan(data: { community_id: number; plan_id: number; billing_cycle: string; price_paid: number }): Promise<any> {
    return await apiFetch<any>("/community-subscriptions/assign/", { method: "POST", body: JSON.stringify(data) });
  },
  async renewPlan(subscriptionId: number, data: { billing_cycle: string; price_paid?: number; coupon?: string }): Promise<any> {
    return await apiFetch<any>(`/community-subscriptions/${subscriptionId}/renew/`, { method: "POST", body: JSON.stringify(data) });
  },
  async cancelPlanAutoRenew(subscriptionId: number): Promise<any> {
    return await apiFetch<any>(`/community-subscriptions/${subscriptionId}/cancel/`, { method: "POST" });
  },
  async updateCommunitySubscription(subscriptionId: number, data: any): Promise<any> {
    return await apiFetch<any>(`/community-subscriptions/${subscriptionId}/`, { method: "PATCH", body: JSON.stringify(data) });
  },

  // Plan Addons Marketplace
  async getPlanAddons(): Promise<any[]> {
    try { return await apiFetch<any[]>("/plan-addons/"); } catch { return []; }
  },
  async purchasePlanAddon(data: { addon_id: number; quantity: number; community_id?: number }): Promise<any> {
    return await apiFetch<any>("/plan-addons/purchase/", { method: "POST", body: JSON.stringify(data) });
  },

  // Subscription History & Invoices
  async getSubscriptionHistory(params?: { community?: number; action?: string; dateFrom?: string; dateTo?: string }): Promise<any[]> {
    const q = new URLSearchParams();
    if (params?.community) q.set("community", String(params.community));
    if (params?.action) q.set("action", params.action);
    if (params?.dateFrom) q.set("date_from", params.dateFrom);
    if (params?.dateTo) q.set("date_to", params.dateTo);
    try { return await apiFetch<any[]>(`/subscription-history/?${q.toString()}`); } catch { return []; }
  },

  // Subscription Audit Logs
  async getSubscriptionAuditLogs(communityId?: number): Promise<any[]> {
    const q = communityId ? `?community=${communityId}` : "";
    try { return await apiFetch<any[]>(`/subscription-audit-logs/${q}`); } catch { return []; }
  },

  // Feature Usage (Quotas)
  async getFeatureUsages(communityId?: number): Promise<any[]> {
    const q = communityId ? `?community=${communityId}` : "";
    try { return await apiFetch<any[]>(`/feature-usages/${q}`); } catch { return []; }
  },

  // Coupon Validation (community subscription)
  async validateSubscriptionCoupon(code: string, planId?: number): Promise<any> {
    return await apiFetch<any>("/plans/validate-coupon/", {
      method: "POST",
      body: JSON.stringify({ code, plan_id: planId })
    });
  },

  // Check module access
  async checkAccess(moduleCode: string, action: string = "view"): Promise<{ has_access: boolean; status: string; reason?: string; current?: number; limit?: number }> {
    return await apiFetch<{ has_access: boolean; status: string; reason?: string; current?: number; limit?: number }>(
      `/community-subscriptions/check-access/?module=${moduleCode}&action=${action}`
    );
  },

  // ─── PHASE 2: Member Premium ──────────────────────────────────────────────
  // Plans
  async getMemberPremiumPlans(): Promise<any[]> {
    try { return await apiFetch<any[]>("/member-premium-plans/"); } catch { return []; }
  },
  async createMemberPremiumPlan(data: any): Promise<any> {
    return await apiFetch<any>("/member-premium-plans/", { method: "POST", body: JSON.stringify(data) });
  },
  async updateMemberPremiumPlan(id: number, data: any): Promise<any> {
    return await apiFetch<any>(`/member-premium-plans/${id}/`, { method: "PATCH", body: JSON.stringify(data) });
  },
  async deleteMemberPremiumPlan(id: number): Promise<void> {
    await apiFetch<void>(`/member-premium-plans/${id}/`, { method: "DELETE" });
  },
  async cloneMemberPremiumPlan(id: number): Promise<any> {
    return await apiFetch<any>(`/member-premium-plans/${id}/clone/`, { method: "POST" });
  },
  async archiveMemberPremiumPlan(id: number): Promise<any> {
    return await apiFetch<any>(`/member-premium-plans/${id}/archive/`, { method: "POST" });
  },
  async getMemberPremiumPlanAnalytics(): Promise<any> {
    try { return await apiFetch<any>("/member-premium-plans/analytics/"); } catch { return {}; }
  },
  async getPremiumFeatureRegistry(): Promise<any[]> {
    try { return await apiFetch<any[]>("/premium-feature-registry/"); } catch { return []; }
  },

  // Features
  async getMemberPremiumFeatures(planId?: number): Promise<any[]> {
    const q = planId ? `?plan=${planId}` : "";
    try { return await apiFetch<any[]>(`/member-premium-features/${q}`); } catch { return []; }
  },
  async createMemberPremiumFeature(data: any): Promise<any> {
    return await apiFetch<any>("/member-premium-features/", { method: "POST", body: JSON.stringify(data) });
  },
  async updateMemberPremiumFeature(id: number, data: any): Promise<any> {
    return await apiFetch<any>(`/member-premium-features/${id}/`, { method: "PATCH", body: JSON.stringify(data) });
  },
  async deleteMemberPremiumFeature(id: number): Promise<void> {
    await apiFetch<void>(`/member-premium-features/${id}/`, { method: "DELETE" });
  },

  // Benefits
  async getMemberPremiumBenefits(planId?: number): Promise<any[]> {
    const q = planId ? `?plan=${planId}` : "";
    try { return await apiFetch<any[]>(`/member-premium-benefits/${q}`); } catch { return []; }
  },
  async createMemberPremiumBenefit(data: any): Promise<any> {
    return await apiFetch<any>("/member-premium-benefits/", { method: "POST", body: JSON.stringify(data) });
  },
  async updateMemberPremiumBenefit(id: number, data: any): Promise<any> {
    return await apiFetch<any>(`/member-premium-benefits/${id}/`, { method: "PATCH", body: JSON.stringify(data) });
  },
  async deleteMemberPremiumBenefit(id: number): Promise<void> {
    await apiFetch<void>(`/member-premium-benefits/${id}/`, { method: "DELETE" });
  },

  // Add-ons
  async getMemberPremiumAddons(): Promise<any[]> {
    try { return await apiFetch<any[]>("/member-premium-addons/"); } catch { return []; }
  },
  async createMemberPremiumAddon(data: any): Promise<any> {
    return await apiFetch<any>("/member-premium-addons/", { method: "POST", body: JSON.stringify(data) });
  },
  async updateMemberPremiumAddon(id: number, data: any): Promise<any> {
    return await apiFetch<any>(`/member-premium-addons/${id}/`, { method: "PATCH", body: JSON.stringify(data) });
  },
  async deleteMemberPremiumAddon(id: number): Promise<void> {
    await apiFetch<void>(`/member-premium-addons/${id}/`, { method: "DELETE" });
  },

  // Coupons
  async getMemberPremiumCoupons(): Promise<any[]> {
    try { return await apiFetch<any[]>("/member-premium-coupons/"); } catch { return []; }
  },
  async createMemberPremiumCoupon(data: any): Promise<any> {
    return await apiFetch<any>("/member-premium-coupons/", { method: "POST", body: JSON.stringify(data) });
  },
  async updateMemberPremiumCoupon(id: number, data: any): Promise<any> {
    return await apiFetch<any>(`/member-premium-coupons/${id}/`, { method: "PATCH", body: JSON.stringify(data) });
  },
  async deleteMemberPremiumCoupon(id: number): Promise<void> {
    await apiFetch<void>(`/member-premium-coupons/${id}/`, { method: "DELETE" });
  },

  // Subscriptions
  async getMemberPremiumSubscriptions(params?: { status?: string; plan?: number; search?: string }): Promise<any[]> {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.plan) q.set("plan", String(params.plan));
    if (params?.search) q.set("search", params.search);
    try { return await apiFetch<any[]>(`/member-premium-subscriptions/?${q.toString()}`); } catch { return []; }
  },
  async assignMemberPremiumSubscription(data: any): Promise<any> {
    return await apiFetch<any>("/member-premium-subscriptions/assign/", { method: "POST", body: JSON.stringify(data) });
  },
  async activateMemberPremiumSubscription(id: number, data: any): Promise<any> {
    return await apiFetch<any>(`/member-premium-subscriptions/${id}/activate/`, { method: "POST", body: JSON.stringify(data) });
  },
  async cancelMemberPremiumSubscription(id: number, data?: any): Promise<any> {
    return await apiFetch<any>(`/member-premium-subscriptions/${id}/cancel/`, { method: "POST", body: JSON.stringify(data || {}) });
  },
  async suspendMemberPremiumSubscription(id: number, data?: any): Promise<any> {
    return await apiFetch<any>(`/member-premium-subscriptions/${id}/suspend/`, { method: "POST", body: JSON.stringify(data || {}) });
  },
  async upgradeMemberPremiumSubscription(id: number, data: { plan_id: number; billing_cycle?: string; payment_method?: string; coupon?: string } | number): Promise<any> {
    const body = typeof data === "number" ? { plan_id: data } : data;
    return await apiFetch<any>(`/member-premium-subscriptions/${id}/upgrade/`, { method: "POST", body: JSON.stringify(body) });
  },

  // Transactions
  async getMemberPremiumTransactions(): Promise<any[]> {
    try { return await apiFetch<any[]>("/member-premium-transactions/"); } catch { return []; }
  },

  // Invoices
  async getMemberPremiumInvoices(): Promise<any[]> {
    try { return await apiFetch<any[]>("/member-premium-invoices/"); } catch { return []; }
  },

  // Audit Logs
  async getMemberPremiumAuditLogs(): Promise<any[]> {
    try { return await apiFetch<any[]>("/member-premium-audit-logs/"); } catch { return []; }
  },

  // Phase 4 additions
  async getMemberMyMembership(): Promise<any> {
    return await apiFetch<any>("/member-premium-subscriptions/my-membership/");
  },
  async renewMemberPremiumSubscription(id: number, data: any): Promise<any> {
    return await apiFetch<any>(`/member-premium-subscriptions/${id}/renew/`, { method: "POST", body: JSON.stringify(data) });
  },
  async purchaseMemberPremiumAddon(id: number, data: any): Promise<any> {
    return await apiFetch<any>(`/member-premium-addons/${id}/purchase/`, { method: "POST", body: JSON.stringify(data) });
  },
  async getMemberPremiumRewards(): Promise<any[]> {
    try { return await apiFetch<any[]>("/member-premium-rewards/"); } catch { return []; }
  },
  async getMemberPremiumTickets(): Promise<any[]> {
    try { return await apiFetch<any[]>("/member-premium-tickets/"); } catch { return []; }
  },
  async createMemberPremiumTicket(data: any): Promise<any> {
    return await apiFetch<any>("/member-premium-tickets/", { method: "POST", body: JSON.stringify(data) });
  },
  async validateMemberPremiumCoupon(data: { code: string; plan_id?: number; amount: number }): Promise<any> {
    return await apiFetch<any>("/member-premium-coupons/validate/", { method: "POST", body: JSON.stringify(data) });
  },
  async checkMemberFeatureLimit(featureCode: string, memberId?: number | string): Promise<{ has_access: boolean; reason?: string; upgrade_message?: string; used?: number; limit?: number; remaining?: number; unlimited?: boolean }> {
    return await apiFetch<any>("/member-premium-subscriptions/check-feature/", {
      method: "POST",
      body: JSON.stringify({ feature_code: featureCode, member_id: memberId })
    });
  },
};

export default api;

