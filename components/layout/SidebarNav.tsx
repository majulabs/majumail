"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Inbox, 
  Send, 
  Star, 
  Archive, 
  Trash2, 
  Settings, 
  Users,
  Plus,
  ChevronDown,
  ChevronRight,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useState } from "react";

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

interface LabelItem {
  id: string;
  name: string;
  color: string;
  count?: number;
}

interface SidebarNavProps {
  labels?: LabelItem[];
  unreadCounts?: {
    inbox: number;
    sent: number;
    starred: number;
    archived: number;
    trash: number;
    [labelId: string]: number;
  };
  onComposeClick?: () => void;
}

export function SidebarNav({ labels = [], unreadCounts = { inbox: 0, sent: 0, starred: 0, archived: 0, trash: 0 }, onComposeClick }: SidebarNavProps) {
  const pathname = usePathname();
  const [labelsExpanded, setLabelsExpanded] = useState(true);

  const mainNavItems: NavItem[] = [
    { name: "Inbox", href: "/inbox", icon: Inbox, badge: unreadCounts.inbox },
    { name: "Sent", href: "/sent", icon: Send },
    { name: "Starred", href: "/starred", icon: Star },
    { name: "Archived", href: "/archived", icon: Archive },
    { name: "Trash", href: "/trash", icon: Trash2 },
  ];

  const bottomNavItems: NavItem[] = [
    { name: "Contacts", href: "/contacts", icon: Users },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Compose Button */}
      {onComposeClick && (
        <div className="p-4">
          <button
            onClick={onComposeClick}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="h-5 w-5" />
            Compose
          </button>
        </div>
      )}

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {/* Main Items */}
        {mainNavItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                  : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="flex-1">{item.name}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className={cn(
                  "px-2 py-0.5 text-xs font-medium rounded-full",
                  isActive
                    ? "bg-blue-100 text-blue-600 dark:bg-blue-800 dark:text-blue-300"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                )}>
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
            </Link>
          );
        })}

        {/* Labels Section */}
        {labels.length > 0 && (
          <div className="pt-4">
            <button
              onClick={() => setLabelsExpanded(!labelsExpanded)}
              className="flex items-center gap-2 px-3 py-2 w-full text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              {labelsExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              Labels
            </button>

            {labelsExpanded && (
              <div className="mt-1 space-y-1">
                {labels.map((label) => {
                  const isActive = pathname === `/labels/${label.id}`;
                  return (
                    <Link
                      key={label.id}
                      href={`/labels/${label.id}`}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                        isActive
                          ? "bg-gray-100 dark:bg-gray-800"
                          : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      )}
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: label.color }}
                      />
                      <span className="flex-1 truncate text-gray-700 dark:text-gray-300">
                        {label.name}
                      </span>
                      {label.count !== undefined && label.count > 0 && (
                        <span className="text-xs text-gray-400">
                          {label.count}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Bottom Navigation */}
      <div className="border-t border-gray-200 dark:border-gray-800 px-3 py-2">
        {bottomNavItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                  : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}