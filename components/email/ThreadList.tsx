"use client";

import { ThreadItem } from "./ThreadItem";
import type { Thread, Label } from "@/lib/db/schema";

interface ThreadWithLabels extends Thread {
  labels: (Label & { appliedBy?: string | null; confidence?: number | null })[];
}

interface ThreadListProps {
  threads: ThreadWithLabels[];
  isLoading?: boolean;
  selectedIndex?: number;
  onSelectIndex?: (index: number) => void;
  threadRefs?: React.MutableRefObject<(HTMLDivElement | null)[]>;
  onStarThread?: (threadId: string) => void;
  onArchiveThread?: (threadId: string) => void;
  onTrashThread?: (threadId: string) => void;
  emptyMessage?: string;
}

export function ThreadList({
  threads,
  isLoading = false,
  selectedIndex = -1,
  onSelectIndex,
  threadRefs,
  onStarThread,
  onArchiveThread,
  onTrashThread,
  emptyMessage = "No emails found",
}: ThreadListProps) {
  if (isLoading) {
    return (
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="px-4 py-4 animate-pulse">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
          <svg
            className="h-8 w-8 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <p className="text-gray-500 dark:text-gray-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-800">
      {threads.map((thread, index) => (
        <div
          key={thread.id}
          ref={(el) => {
            if (threadRefs) {
              threadRefs.current[index] = el;
            }
          }}
          onClick={() => onSelectIndex?.(index)}
        >
          <ThreadItem
            thread={thread}
            isSelected={index === selectedIndex}
            onStar={() => onStarThread?.(thread.id)}
            onArchive={() => onArchiveThread?.(thread.id)}
            onTrash={() => onTrashThread?.(thread.id)}
          />
        </div>
      ))}
    </div>
  );
}