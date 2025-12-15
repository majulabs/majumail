"use client";

import { Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trash2, Star, ArchiveRestore, AlertTriangle } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useThreadListPage } from "@/lib/hooks/useThreadListPage";
import { cn } from "@/lib/utils/cn";
import {
  formatEmailDate,
  truncate,
  extractNameFromEmail,
} from "@/lib/utils/format";
import type { ThreadWithLabels } from "@/lib/types";

interface TrashThreadItemProps {
  thread: ThreadWithLabels;
  onStar: () => void;
  onRestore: () => void;
  onDeletePermanently: () => void;
}

function TrashThreadItem({
  thread,
  onStar,
  onRestore,
  onDeletePermanently,
}: TrashThreadItemProps) {
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
            className="p-1.5 text-gray-400 hover:text-green-600 dark:hover:text-green-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Restore to Inbox"
          >
            <ArchiveRestore className="h-4 w-4" />
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

function TrashContent() {
  const router = useRouter();

  const {
    threads,
    isLoading,
    isRefreshing,
    handleRefresh,
    handleStarThread,
    handleRestoreThread,
    handleDeleteThread,
    handleEmptyTrash,
  } = useThreadListPage({
    filter: "trash",
    enableSSE: true,
    refreshAfterOperation: true,
  });

  const confirmEmptyTrash = () => {
    if (confirm("Are you sure you want to permanently delete all emails in trash? This cannot be undone.")) {
      handleEmptyTrash();
    }
  };

  const confirmDelete = (threadId: string) => {
    if (confirm("Are you sure you want to permanently delete this email? This cannot be undone.")) {
      handleDeleteThread(threadId);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <Header
        title="Trash"
        showSearch
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />
      {threads.length > 0 && (
        <div className="px-6 pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={confirmEmptyTrash}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Empty Trash
          </Button>
        </div>
      )}
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
            <Trash2 className="h-16 w-16 mb-4 opacity-50" />
            <p className="text-lg font-medium">Trash is empty</p>
            <p className="text-sm">Emails you delete will appear here</p>
          </div>
        ) : (
          <>
            {/* Warning banner */}
            <div className="px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4" />
                <span>Emails in Trash will be permanently deleted after 30 days</span>
              </div>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {threads.map((thread) => (
                <TrashThreadItem
                  key={thread.id}
                  thread={thread}
                  onStar={() => handleStarThread(thread.id)}
                  onRestore={() => handleRestoreThread(thread.id, true)}
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

export default function TrashPage() {
  return (
    <Suspense
      fallback={
        <div className="h-full flex items-center justify-center">
          <div className="animate-pulse text-gray-500">Loading...</div>
        </div>
      }
    >
      <TrashContent />
    </Suspense>
  );
}