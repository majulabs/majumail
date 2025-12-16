"use client";

import { Suspense } from "react";
import Link from "next/link";
import { Star, Trash2, ShieldX, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Header } from "@/components/layout/Header";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useThreadListPage } from "@/lib/hooks/useThreadListPage";
import { useRole } from "@/components/providers/RoleProvider";
import { formatEmailDate, truncate, getParticipantNames } from "@/lib/utils/format";
import type { ThreadWithLabels } from "@/lib/types";

interface SpamThreadItemProps {
  thread: ThreadWithLabels;
  onStar: () => void;
  onMarkAsNotSpam: () => void;
  onDeletePermanently: () => void;
}

function SpamThreadItem({
  thread,
  onStar,
  onMarkAsNotSpam,
  onDeletePermanently,
}: SpamThreadItemProps) {
  const handleAction = (
    e: React.MouseEvent,
    action: () => void
  ) => {
    e.preventDefault();
    e.stopPropagation();
    action();
  };

  const participantNames = getParticipantNames(thread);

  return (
    <Link
      href={`/inbox/${thread.id}`}
      className="block px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
    >
      <div className="flex items-start gap-3">
        <Avatar name={participantNames} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-sm truncate flex-1",
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
            onClick={(e) => handleAction(e, onMarkAsNotSpam)}
            className="p-1.5 text-gray-400 hover:text-green-600 dark:hover:text-green-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Not spam"
          >
            <ShieldCheck className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => handleAction(e, onDeletePermanently)}
            className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Delete permanently"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Link>
  );
}

function SpamContent() {
  const { activeRole } = useRole();

  const {
    threads,
    isLoading,
    isRefreshing,
    handleRefresh,
    handleStarThread,
    handleMarkAsNotSpam,
    handleDeleteThread,
    handleEmptySpam,
  } = useThreadListPage({
    filter: "spam",
    enableSSE: true,
    refreshAfterOperation: true,
  });

  const confirmEmptySpam = () => {
    if (
      confirm(
        "Are you sure you want to permanently delete all spam emails? This cannot be undone."
      )
    ) {
      handleEmptySpam();
    }
  };

  const confirmDelete = (threadId: string) => {
    if (
      confirm(
        "Are you sure you want to permanently delete this email? This cannot be undone."
      )
    ) {
      handleDeleteThread(threadId);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <Header
        title={`Spam - ${activeRole.name}`}
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
            <ShieldX className="h-16 w-16 mb-4 opacity-50" />
            <p className="text-lg font-medium">No spam</p>
            <p className="text-sm">
              Emails identified as spam will appear here
            </p>
          </div>
        ) : (
          <>
            {/* Empty Spam button */}
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {threads.length} item{threads.length !== 1 ? "s" : ""} in spam
              </p>
              <Button
                variant="destructive"
                size="sm"
                onClick={confirmEmptySpam}
              >
                Empty Spam
              </Button>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {threads.map((thread) => (
                <SpamThreadItem
                  key={thread.id}
                  thread={thread}
                  onStar={() => handleStarThread(thread.id)}
                  onMarkAsNotSpam={() => handleMarkAsNotSpam(thread.id)}
                  onDeletePermanently={() => confirmDelete(thread.id)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function SpamPage() {
  return (
    <Suspense
      fallback={
        <div className="h-full flex items-center justify-center">
          <div className="animate-pulse text-gray-500">Loading...</div>
        </div>
      }
    >
      <SpamContent />
    </Suspense>
  );
}