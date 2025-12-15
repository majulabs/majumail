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
import type { ThreadWithLabels } from "@/lib/types";

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
  const participantNames = participants.map(extractNameFromEmail).join(", ");

  // Filter to only show non-system labels (max 3)
  const displayLabels = thread.labels.filter((l) => !l.isSystem).slice(0, 3);

  const handleAction = (
    e: React.MouseEvent,
    action: (() => void) | undefined
  ) => {
    e.preventDefault();
    e.stopPropagation();
    action?.();
  };

  return (
    <Link
      href={`/inbox/${thread.id}`}
      className={cn(
        "block px-4 py-3 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group",
        !thread.isRead && "bg-blue-50/50 dark:bg-blue-900/10",
        isSelected &&
          "ring-2 ring-blue-500 ring-inset bg-blue-50 dark:bg-blue-900/20"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <Avatar email={participants[0]} size="md" className="mt-0.5" />

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
                  ? "font-medium text-gray-800 dark:text-gray-200"
                  : "text-gray-600 dark:text-gray-400"
              )}
            >
              {thread.subject || "(no subject)"}
            </p>
            {!thread.isRead && (
              <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
            )}
          </div>

          {/* Snippet */}
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
            {truncate(thread.snippet || "", 100)}
          </p>

          {/* Labels */}
          {displayLabels.length > 0 && (
            <div className="flex items-center gap-1 mt-2">
              {displayLabels.map((label) => (
                <LabelBadge key={label.id} label={label} size="sm" />
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => handleAction(e, onStar)}
            className="p-1.5 text-gray-400 hover:text-yellow-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title={thread.isStarred ? "Unstar" : "Star"}
          >
            <Star
              className={cn(
                "h-4 w-4",
                thread.isStarred && "fill-yellow-500 text-yellow-500"
              )}
            />
          </button>
          <button
            onClick={(e) => handleAction(e, onArchive)}
            className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Archive"
          >
            <Archive className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => handleAction(e, onTrash)}
            className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Trash"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Link>
  );
}