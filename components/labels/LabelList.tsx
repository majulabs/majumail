"use client";

import Link from "next/link";
import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import type { Label } from "@/lib/db/schema";
import {
  Inbox,
  Send,
  Archive,
  Trash2,
  Star,
  Tag,
} from "lucide-react";

interface LabelWithCount extends Label {
  threadCount: number;
  unreadCount?: number;
}

interface LabelListProps {
  labels: LabelWithCount[];
  inboxUnreadCount?: number;
  className?: string;
}

const systemLabelIcons: Record<string, React.ReactNode> = {
  Inbox: <Inbox className="h-4 w-4" />,
  Sent: <Send className="h-4 w-4" />,
  Archived: <Archive className="h-4 w-4" />,
  Trash: <Trash2 className="h-4 w-4" />,
  Starred: <Star className="h-4 w-4" />,
};

function LabelListContent({ labels, inboxUnreadCount = 0, className }: LabelListProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const systemLabels = labels.filter((l) => l.isSystem);
  const customLabels = labels.filter((l) => !l.isSystem);

  const getLabelHref = (label: LabelWithCount) => {
    if (label.name === "Inbox") return "/inbox";
    if (label.name === "Sent") return "/inbox?filter=sent";
    if (label.name === "Archived") return "/inbox?archived=true";
    if (label.name === "Trash") return "/inbox?trashed=true";
    if (label.name === "Starred") return "/inbox?starred=true";
    return `/inbox/label/${label.id}`;
  };

  const isActive = (label: LabelWithCount) => {
    // Check custom labels by path
    if (!label.isSystem) {
      return pathname.includes(`/label/${label.id}`);
    }

    // For system labels, check both pathname and query params
    const filter = searchParams.get("filter");
    const archived = searchParams.get("archived");
    const trashed = searchParams.get("trashed");
    const starred = searchParams.get("starred");

    // If we're on a thread detail page or label page, no system label is active
    if (pathname.includes("/inbox/") && !pathname.endsWith("/inbox")) {
      // Check if it's a thread page (UUID pattern) - no system label active
      const pathParts = pathname.split("/");
      const lastPart = pathParts[pathParts.length - 1];
      if (lastPart && lastPart.match(/^[0-9a-f-]{36}$/i)) {
        return false;
      }
    }

    switch (label.name) {
      case "Inbox":
        return pathname === "/inbox" && !filter && !archived && !trashed && !starred;
      case "Sent":
        return filter === "sent";
      case "Archived":
        return archived === "true";
      case "Trash":
        return trashed === "true";
      case "Starred":
        return starred === "true";
      default:
        return false;
    }
  };

  // Get the unread count for a label
  const getUnreadCount = (label: LabelWithCount) => {
    if (label.name === "Inbox") return inboxUnreadCount;
    return label.unreadCount || 0;
  };

  return (
    <nav className={cn("space-y-1", className)}>
      {/* System Labels */}
      <div className="space-y-1">
        {systemLabels.map((label) => {
          const unread = getUnreadCount(label);
          return (
            <Link
              key={label.id}
              href={getLabelHref(label)}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive(label)
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                  : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              )}
            >
              {systemLabelIcons[label.name] || <Tag className="h-4 w-4" />}
              <span className={cn("flex-1", unread > 0 && "font-semibold")}>
                {label.name}
              </span>
              {unread > 0 ? (
                <span className="min-w-5 h-5 flex items-center justify-center text-xs font-semibold bg-blue-600 text-white rounded-full px-1.5">
                  {unread > 99 ? "99+" : unread}
                </span>
              ) : label.threadCount > 0 ? (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {label.threadCount}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>

      {/* Custom Labels */}
      {customLabels.length > 0 && (
        <>
          <div className="pt-4 pb-2">
            <span className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Labels
            </span>
          </div>
          <div className="space-y-1">
            {customLabels.map((label) => {
              const unread = label.unreadCount || 0;
              return (
                <Link
                  key={label.id}
                  href={`/inbox/label/${label.id}`}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive(label)
                      ? "bg-gray-100 dark:bg-gray-800"
                      : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                  )}
                >
                  <span
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: label.color }}
                  />
                  <span className={cn("flex-1 truncate", unread > 0 && "font-semibold")}>
                    {label.name}
                  </span>
                  {unread > 0 ? (
                    <span 
                      className="min-w-5 h-5 flex items-center justify-center text-xs font-semibold text-white rounded-full px-1.5"
                      style={{ backgroundColor: label.color }}
                    >
                      {unread > 99 ? "99+" : unread}
                    </span>
                  ) : label.threadCount > 0 ? (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {label.threadCount}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </>
      )}
    </nav>
  );
}

export function LabelList(props: LabelListProps) {
  return (
    <Suspense fallback={<div className="px-3 py-2 text-sm text-gray-500">Loading...</div>}>
      <LabelListContent {...props} />
    </Suspense>
  );
}
