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
import {
  ROLES,
  type Role,
  type RoleId,
  type RoleContextValue,
} from "@/lib/types/role";

const STORAGE_KEY = "majumail-active-role";

const RoleContext = createContext<RoleContextValue | null>(null);

interface RoleProviderProps {
  children: ReactNode;
}

export function RoleProvider({ children }: RoleProviderProps) {
  const [activeRoleId, setActiveRoleId] = useState<RoleId>("marcel");
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored in ROLES) {
      setActiveRoleId(stored as RoleId);
    }
    setIsInitialized(true);
  }, []);

  // Switch role handler
  const switchRole = useCallback((roleId: RoleId) => {
    setActiveRoleId(roleId);
    localStorage.setItem(STORAGE_KEY, roleId);
  }, []);

  // Check if email matches active role's mailbox
  const isActiveRole = useCallback(
    (email: string) => {
      const role = ROLES[activeRoleId];
      return email.toLowerCase() === role.mailboxAddress.toLowerCase();
    },
    [activeRoleId]
  );

  // Memoized values
  const activeRole = useMemo(() => ROLES[activeRoleId], [activeRoleId]);
  const allRoles = useMemo(() => Object.values(ROLES), []);
  const activeMailboxAddress = useMemo(
    () => ROLES[activeRoleId].mailboxAddress,
    [activeRoleId]
  );

  const value: RoleContextValue = useMemo(
    () => ({
      activeRole,
      activeRoleId,
      switchRole,
      allRoles,
      isActiveRole,
      activeMailboxAddress,
    }),
    [activeRole, activeRoleId, switchRole, allRoles, isActiveRole, activeMailboxAddress]
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