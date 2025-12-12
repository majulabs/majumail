"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { PenSquare, Settings, LogOut, Menu, X, Users } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { LabelList } from "@/components/labels/LabelList";
import {
  Dropdown,
  DropdownItem,
  DropdownDivider,
} from "@/components/ui/Dropdown";
import { useSSE } from "@/lib/hooks/useSSE";
import { useCompose } from "@/components/providers/ComposeProvider";
import type { Label } from "@/lib/db/schema";
import { useState, useEffect, useCallback } from "react";

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
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [labels, setLabels] = useState<LabelWithCount[]>([]);
  const [inboxUnreadCount, setInboxUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch sidebar data - only when authenticated
  const fetchSidebarData = useCallback(async () => {
    // Don't fetch if not authenticated
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
    // Only fetch when authenticated
    if (status === "authenticated") {
      fetchSidebarData();
    } else if (status === "unauthenticated") {
      setIsLoading(false);
    }
  }, [fetchSidebarData, status]);

  // SSE refresh when new email arrives - only when authenticated
  useSSE(
    (event) => {
      if (event.type === "new_email") {
        fetchSidebarData();
      }
    },
    status === "authenticated" // Only enable SSE when authenticated
  );

  // Close mobile menu when navigating
  const handleNavigation = () => {
    setIsMobileOpen(false);
  };

  // Handle compose button click
  const handleComposeClick = () => {
    openCompose();
    setIsMobileOpen(false);
  };

  // Don't render anything if not authenticated or still loading auth
  if (status === "loading" || status === "unauthenticated" || !session?.user) {
    return null;
  }

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 bg-white dark:bg-gray-900 rounded-lg shadow-md"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col transform transition-transform lg:transform-none",
          isMobileOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-gray-800">
          <Link
            href="/inbox"
            className="flex items-center gap-2"
            onClick={handleNavigation}
          >
            <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              M
            </div>
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              MajuMail
            </span>
          </Link>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
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
                  className="h-9 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse"
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

        {/* Bottom Navigation - Contacts */}
        <div className="px-2 py-2 border-t border-gray-200 dark:border-gray-800">
          <Link
            href="/contacts"
            onClick={handleNavigation}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              pathname === "/contacts"
                ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            )}
          >
            <Users className="h-5 w-5" />
            <span>Contacts</span>
          </Link>
        </div>

        {/* User Section */}
        <div className="border-t border-gray-200 dark:border-gray-800 p-4">
          <Dropdown
            trigger={
              <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <Avatar
                  name={session?.user?.name}
                  email={session?.user?.email || ""}
                  image={session?.user?.image}
                  size="sm"
                />
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {session?.user?.name || session?.user?.email?.split("@")[0]}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {session?.user?.email}
                  </p>
                </div>
              </button>
            }
            align="left"
            position="top"
          >
            <DropdownItem>
              <Link
                href="/settings"
                className="flex items-center gap-2 w-full"
                onClick={handleNavigation}
              >
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            </DropdownItem>
            <DropdownDivider />
            <DropdownItem onClick={() => signOut()}>
              <span className="flex items-center gap-2 text-red-600">
                <LogOut className="h-4 w-4" />
                Sign out
              </span>
            </DropdownItem>
          </Dropdown>
        </div>
      </aside>
    </>
  );
}