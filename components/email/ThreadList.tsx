"use client";

import { RefObject } from "react";
import { ThreadItem } from "./ThreadItem";
import type { Thread, Label } from "@/lib/db/schema";
import { Inbox } from "lucide-react";

interface ThreadWithLabels extends Thread {
  labels: (Label & { appliedBy?: string | null; confidence?: number | null })[];
}

interface ThreadListProps {
  threads: ThreadWithLabels[];
  isLoading?: boolean;
  selectedIndex?: number;
  onSelectIndex?: (index: number) => void;
  threadRefs?: RefObject<(HTMLDivElement | null)[]>;
  onStarThread?: (threadId: string) => void;
  onArchiveThread?: (threadId: string) => void;
  onTrashThread?: (threadId: string) => void;
}

export function ThreadList({
  threads,
  isLoading,
  selectedIndex = -1,
  onSelectIndex,
  threadRefs,
  onStarThread,
  onArchiveThread,
  onTrashThread,
}: ThreadListProps) {
  if (isLoading) {
    return (
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="px-4 py-3 animate-pulse">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-2" />
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-64" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-500 dark:text-gray-400">
        <Inbox className="h-16 w-16 mb-4 opacity-50" />
        <p className="text-lg font-medium">No emails yet</p>
        <p className="text-sm">Your inbox is empty</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-800">
      {threads.map((thread, index) => (
        <div
          key={thread.id}
          ref={(el) => {
            if (threadRefs?.current) {
              threadRefs.current[index] = el;
            }
          }}
          onClick={() => onSelectIndex?.(index)}
        >
          <ThreadItem
            thread={thread}
            isSelected={selectedIndex === index}
            onStar={() => onStarThread?.(thread.id)}
            onArchive={() => onArchiveThread?.(thread.id)}
            onTrash={() => onTrashThread?.(thread.id)}
          />
        </div>
      ))}
    </div>
  );
}
