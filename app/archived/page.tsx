"use client";

import { Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Archive, Star, ArchiveRestore, Trash2 } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Avatar } from "@/components/ui/Avatar";
import { useThreadListPage } from "@/lib/hooks/useThreadListPage";
import { cn } from "@/lib/utils/cn";
import {
  formatEmailDate,
  truncate,
  extractNameFromEmail,
} from "@/lib/utils/format";
import type { ThreadWithLabels } from "@/lib/types";

interface ArchivedThreadItemProps {
  thread: ThreadWithLabels;
  onStar: () => void;
  onRestore: () => void;
  onTrash: () => void;
}

function ArchivedThreadItem({
  thread,
  onStar,
  onRestore,
  onTrash,
}: ArchivedThreadItemProps) {
  const participants = (thread.participantAddresses || []).slice(0, 3);
  const participantNames = participants.map(extractNameFromEmail).join(", ");

  const handleAction = (
    e: React.MouseEvent,
    action: () => void
  ) => {
    e.preventDefault();
    e.stopPropagation();
    action();
  };

  return (
    <Link
      href={`/inbox/${thread.id}`}
      className={cn(
        "block px-4 py-3 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group",
        !thread.isRead && "bg-blue-50/50 dark:bg-blue-900/10"
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar email={participants[0]} size="md" className="mt-0.5" />
        <div className="flex-1 min-w-0">
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
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
            {truncate(thread.snippet || "", 100)}
          </p>
        </div>
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
            onClick={(e) => handleAction(e, onRestore)}
            className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Move to Inbox"
          >
            <ArchiveRestore className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => handleAction(e, onTrash)}
            className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Move to Trash"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Link>
  );
}

function ArchivedContent() {
  const router = useRouter();

  const {
    threads,
    isLoading,
    isRefreshing,
    handleRefresh,
    handleStarThread,
    handleRestoreThread,
    handleTrashThread,
  } = useThreadListPage({
    filter: "archived",
    enableSSE: true,
    refreshAfterOperation: true,
  });

  return (
    <div className="h-full flex flex-col">
      <Header
        title="Archive"
        showSearch
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
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
        ) : threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500 dark:text-gray-400">
            <Archive className="h-16 w-16 mb-4 opacity-50" />
            <p className="text-lg font-medium">No archived emails</p>
            <p className="text-sm">Emails you archive will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {threads.map((thread) => (
              <ArchivedThreadItem
                key={thread.id}
                thread={thread}
                onStar={() => handleStarThread(thread.id)}
                onRestore={() => handleRestoreThread(thread.id, false)}
                onTrash={() => handleTrashThread(thread.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ArchivedPage() {
  return (
    <Suspense
      fallback={
        <div className="h-full flex items-center justify-center">
          <div className="animate-pulse text-gray-500">Loading...</div>
        </div>
      }
    >
      <ArchivedContent />
    </Suspense>
  );
}