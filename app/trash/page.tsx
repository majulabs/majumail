"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { useSSE } from "@/lib/hooks/useSSE";
import { Star, ArchiveRestore, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Avatar } from "@/components/ui/Avatar";
import { formatEmailDate, truncate, extractNameFromEmail } from "@/lib/utils/format";
import Link from "next/link";
import type { Thread, Label } from "@/lib/db/schema";

interface ThreadWithLabels extends Thread {
  labels: (Label & { appliedBy?: string | null; confidence?: number | null })[];
}

// Custom thread item for trash with restore/delete actions
function TrashThreadItem({
  thread,
  onStar,
  onRestore,
  onDeletePermanently,
}: {
  thread: ThreadWithLabels;
  onStar: () => void;
  onRestore: () => void;
  onDeletePermanently: () => void;
}) {
  const participants = (thread.participantAddresses || []).slice(0, 3);
  const participantNames = participants.map(extractNameFromEmail).join(", ");

  const handleAction = (e: React.MouseEvent, action: () => void) => {
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
                ? "font-medium text-gray-900 dark:text-gray-100"
                : "text-gray-600 dark:text-gray-400"
            )}
          >
            {thread.subject || "(No subject)"}
          </p>

          <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
            {truncate(thread.snippet || "", 100)}
          </p>
        </div>

        {/* Quick Actions */}
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
  const [threads, setThreads] = useState<ThreadWithLabels[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Track recent local changes to avoid SSE overwriting them
  const recentChangesRef = useRef<Set<string>>(new Set());

  const fetchThreads = useCallback(async () => {
    try {
      const res = await fetch("/api/threads?filter=trash");
      const data = await res.json();
      setThreads(data.threads || []);
    } catch (error) {
      console.error("Failed to fetch trashed threads:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  // SSE refresh when threads are updated
  useSSE((event) => {
    if (event.type === "thread_updated" || event.type === "new_email") {
      const threadId = event.data?.threadId;
      
      // Skip SSE-triggered refresh if we just made a local change to this thread
      if (threadId && recentChangesRef.current.has(threadId)) {
        return;
      }
      
      fetchThreads();
    }
  });

  const handleRefresh = () => {
    setIsRefreshing(true);
    recentChangesRef.current.clear();
    fetchThreads();
  };

  const handleEmptyTrash = async () => {
    if (!confirm("Are you sure you want to permanently delete all emails in trash? This cannot be undone.")) {
      return;
    }

    try {
      await fetch("/api/threads/delete-all-trashed", {
        method: "DELETE",
      });
      setThreads([]);
      router.refresh();
    } catch (error) {
      console.error("Failed to empty trash:", error);
    }
  };

  const handleStarThread = async (threadId: string) => {
    const thread = threads.find((t) => t.id === threadId);
    if (!thread) return;

    // Mark as recently changed
    recentChangesRef.current.add(threadId);
    setTimeout(() => recentChangesRef.current.delete(threadId), 2000);

    try {
      await fetch(`/api/threads/${threadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isStarred: !thread.isStarred }),
      });
      // Update local state
      setThreads((prev) =>
        prev.map((t) =>
          t.id === threadId ? { ...t, isStarred: !t.isStarred } : t
        )
      );
    } catch (error) {
      console.error("Failed to star thread:", error);
      recentChangesRef.current.delete(threadId);
      fetchThreads();
    }
  };

  const handleRestoreThread = async (threadId: string) => {
    // Mark as recently changed
    recentChangesRef.current.add(threadId);
    setTimeout(() => recentChangesRef.current.delete(threadId), 2000);

    try {
      await fetch(`/api/threads/${threadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isTrashed: false }),
      });
      // Remove from trash list immediately
      setThreads((prev) => prev.filter((t) => t.id !== threadId));
      router.refresh();
    } catch (error) {
      console.error("Failed to restore thread:", error);
      recentChangesRef.current.delete(threadId);
      fetchThreads();
    }
  };

  const handleDeletePermanently = async (threadId: string) => {
    if (!confirm("Are you sure you want to permanently delete this email? This cannot be undone.")) {
      return;
    }

    // Mark as recently changed
    recentChangesRef.current.add(threadId);
    setTimeout(() => recentChangesRef.current.delete(threadId), 2000);

    try {
      await fetch(`/api/threads/${threadId}`, {
        method: "DELETE",
      });
      // Remove from list immediately
      setThreads((prev) => prev.filter((t) => t.id !== threadId));
      router.refresh();
    } catch (error) {
      console.error("Failed to delete thread:", error);
      recentChangesRef.current.delete(threadId);
      fetchThreads();
    }
  };

  return (
    <div className="h-full flex flex-col">
      <Header
        title="Trash"
        showSearch={true}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />
      
      {/* Empty Trash Button */}
      {threads.length > 0 && (
        <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleEmptyTrash}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Empty Trash
          </Button>
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto">
        {isLoading || isRefreshing ? (
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
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
              <Trash2 className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-gray-500 dark:text-gray-400">Trash is empty</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {threads.map((thread) => (
              <TrashThreadItem
                key={thread.id}
                thread={thread}
                onStar={() => handleStarThread(thread.id)}
                onRestore={() => handleRestoreThread(thread.id)}
                onDeletePermanently={() => handleDeletePermanently(thread.id)}
              />
            ))}
          </div>
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
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
        </div>
      }
    >
      <TrashContent />
    </Suspense>
  );
}