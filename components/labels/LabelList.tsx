"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Inbox,
  Send,
  Star,
  Archive,
  Trash2,
  ShieldAlert,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { Label } from "@/lib/db/schema";

interface LabelWithCount extends Label {
  threadCount: number;
  unreadCount?: number;
}

interface LabelListProps {
  labels: LabelWithCount[];
  inboxUnreadCount?: number;
  onNavigate?: () => void;
}

// Core navigation items that always show (regardless of database labels)
const CORE_NAV_ITEMS = [
  { name: "Inbox", icon: Inbox, href: "/inbox" },
  { name: "Sent", icon: Send, href: "/sent" },
  { name: "Starred", icon: Star, href: "/starred" },
  { name: "Archive", icon: Archive, href: "/archived" },
  { name: "Spam", icon: ShieldAlert, href: "/spam" },
  { name: "Trash", icon: Trash2, href: "/trash" },
];

export function LabelList({
  labels,
  inboxUnreadCount = 0,
  onNavigate,
}: LabelListProps) {
  const pathname = usePathname();

  // Deduplicate labels by name (keep first occurrence)
  const deduplicatedLabels = labels.reduce<LabelWithCount[]>((acc, label) => {
    if (!acc.find((l) => l.name === label.name)) {
      acc.push(label);
    }
    return acc;
  }, []);

  // Create a map of label names to their data for quick lookup
  const labelsByName = new Map(
    deduplicatedLabels.filter((l) => l.isSystem).map((l) => [l.name, l])
  );

  // Get custom (non-system) labels
  const customLabels = deduplicatedLabels.filter((l) => !l.isSystem);

  return (
    <div className="space-y-1">
      {/* Core Navigation Items - Always Shown */}
      {CORE_NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        
        // Try to get count from database label if it exists
        const dbLabel = labelsByName.get(item.name);
        const unreadCount = item.name === "Inbox" 
          ? inboxUnreadCount 
          : dbLabel?.unreadCount;

        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              isActive
                ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="flex-1">{item.name}</span>
            {unreadCount !== undefined && unreadCount > 0 && (
              <span
                className={cn(
                  "text-xs px-2 py-0.5 rounded-full",
                  isActive
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200"
                    : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                )}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Link>
        );
      })}

      {/* Custom Labels */}
      {customLabels.length > 0 && (
        <>
          <div className="px-3 pt-4 pb-2">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Labels
            </span>
          </div>
          {customLabels.map((label) => {
            const isActive = pathname === `/inbox/label/${label.id}`;

            return (
              <Link
                key={label.id}
                href={`/inbox/label/${label.id}`}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                    : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                )}
              >
                <Tag
                  className="h-4 w-4"
                  style={{ color: label.color || undefined }}
                />
                <span className="flex-1 truncate">{label.name}</span>
                {label.threadCount > 0 && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {label.threadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </>
      )}
    </div>
  );
}