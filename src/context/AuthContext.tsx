import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";

export type Role = "member" | "community_admin" | "super_admin";
export type Plan = "Free" | "Basic" | "Pro" | "Enterprise";

export const ALL_PERMISSIONS = [
  "View Members", "Add Members", "Edit Members", "Delete Members", "Approve Members",
  "View Committee", "Add Committee Members", "Edit Committee Members", "Remove Committee Members",
  "View Families", "Add Families", "Edit Families", "Delete Families",
  "View Events", "Create Events", "Edit Events", "Delete Events",
  "View News", "Create News", "Edit News", "Delete News",
  "View Gallery", "Upload Photos", "Edit Photos", "Delete Photos",
  "View Donations", "Manage Donations",
  "View Jobs", "Create Jobs", "Edit Jobs", "Delete Jobs",
  "View Businesses", "Add Businesses", "Edit Businesses", "Delete Businesses",
  "View Profiles", "Approve Profiles", "Manage Matches", "Manage Interests",
  "View Reports", "Export Reports",
  "Edit Community Profile", "Manage Logo", "Manage Banner", "Manage Community Information",
  "View Hierarchy", "Manage Subsidiaries"
];

export interface User {
  id: string;
  name: string;
  role: Role;
  email: string;
  avatar: string;
  communityName: string;
  communityId?: string | number;
  communityLogo?: string;
  communityCover?: string;
  communityType?: string;
  parentCommunityName?: string;
  parentCommunityType?: string;
  parentCommunityId?: string | number;
  gender?: string;
  plan: Plan;
  planExpiry: string;
  permissions?: string[];
  effectivePermissions?: string[];
  customRoleName?: string;
}

import { api } from "@/lib/api";

interface AuthCtx {
  user: User | null;
  effectivePermissions: string[];
  login: (u: User) => void;
  loginWithApi: (username: string, password: string) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<User | null>;
}

const Ctx = createContext<AuthCtx>({
  user: null,
  effectivePermissions: [],
  login: () => { },
  loginWithApi: async () => { throw new Error("Not implemented"); },
  logout: () => { },
  refreshUser: async () => null
});

const STORAGE = "wag_user";

export const DEMO_USERS: Record<Role, User> = {
  member: {
    id: "u1", name: "Rohit Patel", role: "member", email: "rohit@example.com",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop",
    communityName: "Rampara Ahir Samaj", plan: "Basic", planExpiry: "2026-09-15",
  },
  community_admin: {
    id: "u2", name: "Mehul Solanki", role: "community_admin", email: "mehul@samaj.org",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop",
    communityName: "Rajula Samaj Mandal", plan: "Pro", planExpiry: "2026-12-31",
  },
  super_admin: {
    id: "u3", name: "Admin Desai", role: "super_admin", email: "admin@weareunited.in",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop",
    communityName: "WE ARE UNITED Platform", plan: "Enterprise", planExpiry: "2027-12-31",
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem(STORAGE);
      if (raw) {
        try {
          return JSON.parse(raw);
        } catch (e) { }
      }
    }
    return null;
  });

  const login = useCallback((u: User) => {
    localStorage.setItem(STORAGE, JSON.stringify(u));
    setUser(u);
  }, []);

  const loginWithApi = useCallback(async (username: string, password_raw: string): Promise<User> => {
    const apiUser = await api.login(username, password_raw);
    const mappedUser: User = {
      id: String(apiUser.id),
      name: apiUser.name,
      role: apiUser.role as Role,
      email: apiUser.email,
      avatar: apiUser.avatar,
      communityName: apiUser.communityName,
      communityId: apiUser.communityId,
      communityLogo: apiUser.communityLogo,
      communityCover: apiUser.communityCover,
      communityType: apiUser.communityType,
      parentCommunityName: apiUser.parentCommunityName,
      parentCommunityType: apiUser.parentCommunityType,
      parentCommunityId: apiUser.parentCommunityId,
      gender: apiUser.gender,
      plan: apiUser.plan as Plan,
      planExpiry: apiUser.planExpiry || "2027-12-31",
      permissions: apiUser.permissions || [],
      effectivePermissions: apiUser.permissions || [],
      customRoleName: apiUser.customRoleName,
    };
    localStorage.setItem(STORAGE, JSON.stringify(mappedUser));
    setUser(mappedUser);
    return mappedUser;
  }, []);

  const refreshUser = useCallback(async (): Promise<User | null> => {
    try {
      const apiUser = await api.getCurrentUser();
      if (!apiUser) return null;
      const mappedUser: User = {
        id: String(apiUser.id),
        name: apiUser.name,
        role: apiUser.role as Role,
        email: apiUser.email,
        avatar: apiUser.avatar,
        communityName: apiUser.communityName,
        communityId: apiUser.communityId,
        communityLogo: apiUser.communityLogo,
        communityCover: apiUser.communityCover,
        communityType: apiUser.communityType,
        parentCommunityName: apiUser.parentCommunityName,
        parentCommunityType: apiUser.parentCommunityType,
        parentCommunityId: apiUser.parentCommunityId,
        gender: apiUser.gender,
        plan: apiUser.plan as Plan,
        planExpiry: apiUser.planExpiry || "2027-12-31",
        permissions: apiUser.permissions || [],
        effectivePermissions: apiUser.permissions || [],
        customRoleName: apiUser.customRoleName,
      };
      localStorage.setItem(STORAGE, JSON.stringify(mappedUser));
      setUser(mappedUser);
      return mappedUser;
    } catch (e) {
      console.error("Failed to refresh user", e);
      return null;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE);
    localStorage.removeItem("wag_token");
    localStorage.removeItem("wag_refresh");
    setUser(null);
  }, []);

  const effectivePermissions = (() => {
    if (!user) return [];
    if (user.role === "super_admin") return ALL_PERMISSIONS;
    if (user.role === "community_admin" && !user.customRoleName) return ALL_PERMISSIONS;
    return user.permissions || [];
  })();

  return <Ctx.Provider value={{ user, effectivePermissions, login, loginWithApi, logout, refreshUser }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);

