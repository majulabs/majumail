"use client";

import Link from "next/link";
import { Star, Archive, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Avatar } from "@/components/ui/Avatar";
import { LabelBadge } from "@/components/labels/LabelBadge";
import {
  formatEmailDate,
  truncate,
  extractNameFromEmail,
} from "@/lib/utils/format";
import type { Thread, Label } from "@/lib/db/schema";

interface ThreadWithLabels extends Thread {
  labels: (Label & { appliedBy?: string | null; confidence?: number | null })[];
}

interface ThreadItemProps {
  thread: ThreadWithLabels;
  isSelected?: boolean;
  onStar?: () => void;
  onArchive?: () => void;
  onTrash?: () => void;
}

export function ThreadItem({
  thread,
  isSelected = false,
  onStar,
  onArchive,
  onTrash,
}: ThreadItemProps) {
  // Get display names from participants
  const participants = (thread.participantAddresses || []).slice(0, 3);
  const participantNames = participants
    .map(extractNameFromEmail)
    .join(", ");
  
  // Filter to only show non-system labels
  const displayLabels = thread.labels.filter((l) => !l.isSystem).slice(0, 3);
  const hasMoreLabels = thread.labels.filter((l) => !l.isSystem).length > 3;

  return (
    <Link
      href={`/inbox/${thread.id}`}
      className={cn(
        "block px-4 py-3 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group",
        !thread.isRead && "bg-blue-50/50 dark:bg-blue-900/10",
        isSelected && "ring-2 ring-blue-500 ring-inset bg-blue-50 dark:bg-blue-900/20"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <Avatar
          email={participants[0]}
          size="md"
          className="mt-0.5"
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <span
              className={cn(
                "text-sm truncate",
                !thread.isRead
                  ? "font-semibold text-gray-900 dark:text-gray-100"
                  : "text-gray-700 dark:text-gray-300"
              )}
            >
              {participantNames || "Unknown"}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
              {formatEmailDate(thread.lastMessageAt)}
            </span>
          </div>

          {/* Subject + Unread Dot */}
          <div className="flex items-center gap-2">
            <p
              className={cn(
                "text-sm truncate mt-0.5",
                !thread.isRead
                  ? "font-medium text-gray-900 dark:text-gray-100"
                  : "text-gray-600 dark:text-gray-400"
              )}
            >
              {thread.subject || "(No subject)"}
            </p>
            {!thread.isRead && (
              <span
                className="inline-block w-2 h-2 rounded-full bg-blue-500 ml-1"
                title="Unread"
              />
            )}
          </div>

          {/* Snippet */}
          <p className="text-sm text-gray-500 dark:text-gray-500 truncate mt-0.5">
            {truncate(thread.snippet || "", 100)}
          </p>

          {/* Labels */}
          {displayLabels.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2">
              {displayLabels.map((label) => (
                <LabelBadge key={label.id} label={label} size="sm" />
              ))}
              {hasMoreLabels && (
                <span className="text-xs text-gray-400">
                  +{thread.labels.filter((l) => !l.isSystem).length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Actions (show on hover) */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.preventDefault();
              onStar?.();
            }}
            className="p-1.5 text-gray-400 hover:text-yellow-500 rounded transition-colors"
          >
            <Star
              className={cn(
                "h-4 w-4",
                thread.isStarred && "fill-yellow-500 text-yellow-500"
              )}
            />
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              onArchive?.();
            }}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
          >
            <Archive className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              onTrash?.();
            }}
            className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Link>
  );
}
