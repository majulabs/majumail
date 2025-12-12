"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { ThreadList } from "@/components/email/ThreadList";
import { useSSE } from "@/lib/hooks/useSSE";
import { Star } from "lucide-react";
import type { Thread, Label } from "@/lib/db/schema";

interface ThreadWithLabels extends Thread {
  labels: (Label & { appliedBy?: string | null; confidence?: number | null })[];
}

function StarredContent() {
  const router = useRouter();
  const [threads, setThreads] = useState<ThreadWithLabels[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const threadRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  // Track recent local changes to avoid SSE overwriting them
  const recentChangesRef = useRef<Set<string>>(new Set());

  const fetchThreads = useCallback(async () => {
    try {
      const res = await fetch("/api/threads?filter=starred");
      const data = await res.json();
      setThreads(data.threads || []);
    } catch (error) {
      console.error("Failed to fetch starred threads:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  // SSE refresh when threads are updated (including star changes from other pages)
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

  const handleStarThread = async (threadId: string) => {
    const thread = threads.find((t) => t.id === threadId);
    if (!thread) return;

    // Mark this thread as recently changed to prevent SSE from overwriting
    recentChangesRef.current.add(threadId);
    setTimeout(() => recentChangesRef.current.delete(threadId), 2000);

    try {
      await fetch(`/api/threads/${threadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isStarred: !thread.isStarred }),
      });
      
      // When unstarring on the starred page, remove the thread from the list
      if (thread.isStarred) {
        setThreads((prev) => prev.filter((t) => t.id !== threadId));
      }
    } catch (error) {
      console.error("Failed to toggle star:", error);
      // Revert on error by refetching
      recentChangesRef.current.delete(threadId);
      fetchThreads();
    }
  };

  const handleArchiveThread = async (threadId: string) => {
    // Mark as recently changed
    recentChangesRef.current.add(threadId);
    setTimeout(() => recentChangesRef.current.delete(threadId), 2000);

    try {
      await fetch(`/api/threads/${threadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: true }),
      });
      setThreads((prev) => prev.filter((t) => t.id !== threadId));
      router.refresh();
    } catch (error) {
      console.error("Failed to archive thread:", error);
      recentChangesRef.current.delete(threadId);
      fetchThreads();
    }
  };

  const handleTrashThread = async (threadId: string) => {
    // Mark as recently changed
    recentChangesRef.current.add(threadId);
    setTimeout(() => recentChangesRef.current.delete(threadId), 2000);

    try {
      await fetch(`/api/threads/${threadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isTrashed: true }),
      });
      setThreads((prev) => prev.filter((t) => t.id !== threadId));
      router.refresh();
    } catch (error) {
      console.error("Failed to trash thread:", error);
      recentChangesRef.current.delete(threadId);
      fetchThreads();
    }
  };

  return (
    <div className="h-full flex flex-col">
      <Header
        title="Starred"
        showSearch={true}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />
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
              <Star className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-gray-500 dark:text-gray-400">No starred emails</p>
          </div>
        ) : (
          <ThreadList
            threads={threads}
            isLoading={false}
            selectedIndex={selectedIndex}
            onSelectIndex={setSelectedIndex}
            threadRefs={threadRefs}
            onStarThread={handleStarThread}
            onArchiveThread={handleArchiveThread}
            onTrashThread={handleTrashThread}
            emptyMessage="No starred emails"
          />
        )}
      </div>
    </div>
  );
}

export default function StarredPage() {
  return (
    <Suspense
      fallback={
        <div className="h-full flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
        </div>
      }
    >
      <StarredContent />
    </Suspense>
  );
}