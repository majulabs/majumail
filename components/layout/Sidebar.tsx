"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { PenSquare, Settings, LogOut, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { LabelList } from "@/components/labels/LabelList";
import { Dropdown, DropdownItem, DropdownDivider } from "@/components/ui/Dropdown";
import type { Label } from "@/lib/db/schema";
import { useState, useEffect } from "react";
import { useSidebarSSERefresh } from "@/components/hooks/useSidebarSSERefresh";

interface LabelWithCount extends Label {
  threadCount: number;
  unreadCount?: number;
}

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const { data: session } = useSession();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [labels, setLabels] = useState<LabelWithCount[]>([]);
  const [inboxUnreadCount, setInboxUnreadCount] = useState(0);

  // Fetch sidebar data
  const fetchSidebarData = async () => {
    const res = await fetch("/api/sidebar-data");
    const data = await res.json();
    setLabels(data.labels || []);
    setInboxUnreadCount(data.inboxUnreadCount || 0);
  };

  useEffect(() => {
    fetchSidebarData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useSidebarSSERefresh(fetchSidebarData);

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 bg-white dark:bg-gray-900 rounded-lg shadow-md"
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
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-gray-800">
          <Link href="/inbox" className="flex items-center gap-2">
            <div className="h-8 w-8 bg-linear-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              M
            </div>
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              MajuMail
            </span>
          </Link>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Compose Button */}
        <div className="px-4 py-4">
          <Link href="/compose">
            <Button className="w-full">
              <PenSquare className="h-4 w-4 mr-2" />
              Compose
            </Button>
          </Link>
        </div>

        {/* Labels Navigation */}
        <div className="flex-1 overflow-y-auto px-2">
          <LabelList labels={labels} inboxUnreadCount={inboxUnreadCount} />
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
            <DropdownItem onClick={() => {}}>
              <Link href="/settings" className="flex items-center gap-2">
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
