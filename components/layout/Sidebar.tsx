"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { PenSquare, Settings, LogOut, Menu, X, Users, Download, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { LabelList } from "@/components/labels/LabelList";
import { RoleSwitcher } from "@/components/role/RoleSwitcher";
import { useSSE } from "@/lib/hooks/useSSE";
import { useCompose } from "@/components/providers/ComposeProvider";
import { useRole } from "@/components/providers/RoleProvider";
import type { Label } from "@/lib/db/schema";
import { useState, useEffect, useCallback, useRef } from "react";

// Optional PWA support - comment out if not using PWA features
// import { usePWA } from "@/components/providers/PWAProvider";

interface LabelWithCount extends Label {
  threadCount: number;
  unreadCount?: number;
}

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const { openCompose } = useCompose();
  const { activeRole } = useRole();
  
  // PWA support - uncomment if using PWAProvider
  // const { isInstallable, installPWA } = usePWA();
  const isInstallable = false; // Set to usePWA().isInstallable if using PWA
  const installPWA = async () => {}; // Set to usePWA().installPWA if using PWA
  
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [labels, setLabels] = useState<LabelWithCount[]>([]);
  const [inboxUnreadCount, setInboxUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Fetch sidebar data - only when authenticated
  const fetchSidebarData = useCallback(async () => {
    if (status !== "authenticated" || !session?.user) {
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/sidebar-data");
      if (!res.ok) {
        throw new Error("Failed to fetch sidebar data");
      }
      const data = await res.json();
      setLabels(data.labels || []);
      setInboxUnreadCount(data.inboxUnreadCount || 0);
    } catch (error) {
      console.error("Failed to fetch sidebar data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [session?.user, status]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchSidebarData();
    } else if (status === "unauthenticated") {
      setIsLoading(false);
    }
  }, [fetchSidebarData, status]);

  // SSE refresh when new email arrives
  useSSE(
    (event) => {
      if (event.type === "new_email") {
        fetchSidebarData();
      }
    },
    status === "authenticated"
  );

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile menu when navigating
  const handleNavigation = () => {
    setIsMobileOpen(false);
  };

  // Handle compose button click
  const handleComposeClick = () => {
    openCompose();
    setIsMobileOpen(false);
  };

  // Close sidebar when pressing escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showUserMenu) setShowUserMenu(false);
        else if (isMobileOpen) setIsMobileOpen(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isMobileOpen, showUserMenu]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileOpen]);

  // Don't render anything if not authenticated
  if (status === "loading" || status === "unauthenticated" || !session?.user) {
    return null;
  }

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-40 p-2 bg-white dark:bg-gray-900 rounded-lg shadow-md border border-gray-200 dark:border-gray-700"
        style={{ 
          top: 'max(0.75rem, env(safe-area-inset-top, 0.75rem))',
          left: 'max(0.75rem, env(safe-area-inset-left, 0.75rem))'
        }}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-[280px] sm:w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col transform transition-transform duration-300 ease-out lg:transform-none",
          isMobileOpen
            ? "translate-x-0 shadow-2xl"
            : "-translate-x-full lg:translate-x-0",
          className
        )}
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* Header - ALIGNED with main content header (h-14 = 56px) */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <Link
            href="/inbox"
            className="flex items-center gap-2"
            onClick={handleNavigation}
          >
            {/* Custom MajuMail Icon */}
            <Image
              src="/mm-icon.svg"
              alt="MajuMail"
              width={32}
              height={32}
              className="rounded-lg"
              priority
            />
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              MajuMail
            </span>
          </Link>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Role Switcher */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <RoleSwitcher />
        </div>

        {/* Compose Button */}
        <div className="px-4 py-4">
          <Button className="w-full" onClick={handleComposeClick}>
            <PenSquare className="h-4 w-4 mr-2" />
            Compose
          </Button>
        </div>

        {/* Labels Navigation */}
        <div className="flex-1 overflow-y-auto px-2">
          {isLoading ? (
            <div className="space-y-2 p-2">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-10 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : (
            <LabelList
              labels={labels}
              inboxUnreadCount={inboxUnreadCount}
              onNavigate={handleNavigation}
            />
          )}
        </div>

        {/* Bottom Navigation */}
        <div className="border-t border-gray-200 dark:border-gray-800">
          {/* Contacts Link */}
          <div className="px-2 py-2">
            <Link
              href="/contacts"
              onClick={handleNavigation}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                pathname === "/contacts"
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              )}
            >
              <Users className="h-5 w-5" />
              Contacts
            </Link>
          </div>

          {/* Install PWA Button - only show if available */}
          {isInstallable && (
            <div className="px-2 pb-2">
              <button
                onClick={installPWA}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              >
                <Download className="h-5 w-5" />
                Install App
              </button>
            </div>
          )}

          {/* User Menu - Opens UPWARD */}
          <div className="px-2 py-2 border-t border-gray-200 dark:border-gray-800 relative" ref={userMenuRef}>
            <button 
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <div
                className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0"
                style={{ backgroundColor: activeRole.avatarColor }}
              >
                {activeRole.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {activeRole.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {session.user.email}
                </p>
              </div>
              <ChevronUp className={cn(
                "h-4 w-4 text-gray-400 transition-transform",
                showUserMenu && "rotate-180"
              )} />
            </button>

            {/* Dropdown menu - Opens UPWARD */}
            {showUserMenu && (
              <div className="absolute bottom-full left-2 right-2 mb-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden z-50">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    handleNavigation();
                    window.location.href = "/settings/knowledge";
                  }}
                  className="flex items-center gap-2 w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </button>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex items-center gap-2 w-full px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}