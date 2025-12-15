"use client";

import { useState, useRef } from "react";
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

const SWIPE_THRESHOLD = 80;

export function ThreadItem({
  thread,
  isSelected = false,
  onStar,
  onArchive,
  onTrash,
}: ThreadItemProps) {
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isHorizontalSwipe = useRef<boolean | null>(null);

  // Get display names from participants
  const participants = (thread.participantAddresses || []).slice(0, 3);
  const participantNames = participants.map(extractNameFromEmail).join(", ");

  // Filter to only show non-system labels (max 3)
  const displayLabels = thread.labels.filter((l) => !l.isSystem).slice(0, 3);

  const handleAction = (
    e: React.MouseEvent | React.TouchEvent,
    action: (() => void) | undefined
  ) => {
    e.preventDefault();
    e.stopPropagation();
    action?.();
  };

  // Touch handlers for swipe (mobile only)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isHorizontalSwipe.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - touchStartX.current;
    const diffY = currentY - touchStartY.current;

    // Determine swipe direction on first significant movement
    if (isHorizontalSwipe.current === null) {
      if (Math.abs(diffX) > 10 || Math.abs(diffY) > 10) {
        isHorizontalSwipe.current = Math.abs(diffX) > Math.abs(diffY);
      }
    }

    // Only handle horizontal swipes
    if (isHorizontalSwipe.current) {
      e.preventDefault();
      setIsSwiping(true);
      // Limit swipe distance
      const clampedX = Math.max(-150, Math.min(150, diffX));
      setSwipeX(clampedX);
    }
  };

  const handleTouchEnd = () => {
    if (Math.abs(swipeX) > SWIPE_THRESHOLD) {
      if (swipeX > 0) {
        // Swipe right - Archive
        onArchive?.();
      } else {
        // Swipe left - Delete
        onTrash?.();
      }
    }
    setSwipeX(0);
    setIsSwiping(false);
    isHorizontalSwipe.current = null;
  };

  return (
    <div className="relative overflow-hidden">
      {/* Swipe action indicators - mobile only */}
      <div
        className={cn(
          "absolute inset-y-0 left-0 flex items-center justify-center bg-blue-500 text-white transition-opacity lg:hidden",
          swipeX > 20 ? "opacity-100" : "opacity-0"
        )}
        style={{ width: Math.max(0, swipeX) }}
      >
        <Archive className="h-5 w-5" />
      </div>
      <div
        className={cn(
          "absolute inset-y-0 right-0 flex items-center justify-center bg-red-500 text-white transition-opacity lg:hidden",
          swipeX < -20 ? "opacity-100" : "opacity-0"
        )}
        style={{ width: Math.max(0, -swipeX) }}
      >
        <Trash2 className="h-5 w-5" />
      </div>

      {/* Main content */}
      <Link
        href={`/inbox/${thread.id}`}
        className={cn(
          "block px-4 py-3 border-b border-gray-100 dark:border-gray-800 transition-colors group relative bg-white dark:bg-gray-900",
          !thread.isRead && "bg-blue-50/50 dark:bg-blue-900/10",
          isSelected && "ring-2 ring-blue-500 ring-inset bg-blue-50 dark:bg-blue-900/20",
          isSwiping ? "" : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
        )}
        style={{
          transform: `translateX(${swipeX}px)`,
          transition: isSwiping ? "none" : "transform 0.2s ease-out",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <Avatar email={participants[0]} size="md" className="mt-0.5 shrink-0" />

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header row */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {/* Unread indicator */}
                {!thread.isRead && (
                  <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                )}
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
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap shrink-0">
                {formatEmailDate(thread.lastMessageAt)}
              </span>
            </div>

            {/* Subject */}
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

            {/* Snippet */}
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
              {truncate(thread.snippet || "", 80)}
            </p>

            {/* Labels row */}
            {displayLabels.length > 0 && (
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                {displayLabels.slice(0, 2).map((label) => (
                  <LabelBadge key={label.id} label={label} size="sm" />
                ))}
                {displayLabels.length > 2 && (
                  <span className="text-xs text-gray-400">
                    +{displayLabels.length - 2}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Action buttons - ALL appear on hover together on desktop */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button
              onClick={(e) => handleAction(e, onStar)}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                thread.isStarred
                  ? "text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
                  : "text-gray-400 hover:text-yellow-500 hover:bg-gray-100 dark:hover:bg-gray-700"
              )}
              title={thread.isStarred ? "Unstar" : "Star"}
            >
              <Star
                className={cn(
                  "h-4 w-4",
                  thread.isStarred && "fill-yellow-500"
                )}
              />
            </button>
            <button
              onClick={(e) => handleAction(e, onArchive)}
              className="p-1.5 text-gray-400 hover:text-blue-500 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title={thread.isArchived ? "Unarchive" : "Archive"}
            >
              <Archive className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => handleAction(e, onTrash)}
              className="p-1.5 text-gray-400 hover:text-red-500 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Link>
    </div>
  );
}