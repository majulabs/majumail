"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import {
  TEAM_MEMBERS,
  findMemberByEmail,
  type TeamMember,
  type RoleId,
  type RoleContextValue,
} from "@/lib/types/role";

const STORAGE_KEY = "majumail-active-role";

const RoleContext = createContext<RoleContextValue | null>(null);

interface RoleProviderProps {
  children: ReactNode;
}

export function RoleProvider({ children }: RoleProviderProps) {
  const { data: session } = useSession();
  const [activeRoleId, setActiveRoleId] = useState<RoleId>("marcel");
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize from localStorage or session email
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Try to load from localStorage first
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && (stored === "marcel" || stored === "julien")) {
      setActiveRoleId(stored as RoleId);
      setIsInitialized(true);
      return;
    }

    // If not stored, try to infer from session email
    if (session?.user?.email) {
      const member = findMemberByEmail(session.user.email);
      if (member) {
        setActiveRoleId(member.id as RoleId);
        localStorage.setItem(STORAGE_KEY, member.id);
      }
    }
    setIsInitialized(true);
  }, [session?.user?.email]);

  // Switch role handler
  const switchRole = useCallback((roleId: RoleId) => {
    setActiveRoleId(roleId);
    localStorage.setItem(STORAGE_KEY, roleId);
  }, []);

  // Check if email matches active role
  const isActiveRole = useCallback(
    (email: string) => {
      const role = TEAM_MEMBERS[activeRoleId];
      return (
        email.toLowerCase() === role.email.toLowerCase() ||
        email.toLowerCase() === role.mailboxAddress.toLowerCase()
      );
    },
    [activeRoleId]
  );

  // Memoized values
  const activeRole = useMemo(() => TEAM_MEMBERS[activeRoleId], [activeRoleId]);
  const teamMembers = useMemo(() => Object.values(TEAM_MEMBERS), []);
  const otherMember = useMemo(
    () => TEAM_MEMBERS[activeRoleId === "marcel" ? "julien" : "marcel"],
    [activeRoleId]
  );

  const value: RoleContextValue = useMemo(
    () => ({
      activeRole,
      activeRoleId,
      switchRole,
      teamMembers,
      isActiveRole,
      otherMember,
    }),
    [activeRole, activeRoleId, switchRole, teamMembers, isActiveRole, otherMember]
  );

  // Don't render children until we've initialized from storage
  // This prevents hydration mismatch
  if (!isInitialized) {
    return null;
  }

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

/**
 * Hook to access the role context
 */
export function useRole(): RoleContextValue {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error("useRole must be used within a RoleProvider");
  }
  return context;
}