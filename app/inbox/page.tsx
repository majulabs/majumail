"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { ThreadList } from "@/components/email/ThreadList";
import { useInboxShortcuts } from "@/hooks/useKeyboardShortcuts";
import type { Thread, Label } from "@/lib/db/schema";

interface ThreadWithLabels extends Thread {
  labels: (Label & { appliedBy?: string | null; confidence?: number | null })[];
}

function InboxContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [threads, setThreads] = useState<ThreadWithLabels[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const threadRefs = useRef<(HTMLDivElement | null)[]>([]);

  const archived = searchParams.get("archived") === "true";
  const trashed = searchParams.get("trashed") === "true";
  const starred = searchParams.get("starred") === "true";
  const filter = searchParams.get("filter"); // "sent" for sent emails
  const search = searchParams.get("search");

  const fetchThreads = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (archived) params.set("archived", "true");
      if (trashed) params.set("trashed", "true");
      if (starred) params.set("starred", "true");
      if (filter) params.set("filter", filter);

      const res = await fetch(`/api/threads?${params.toString()}`);
      const data = await res.json();
      setThreads(data.threads || []);
    } catch (error) {
      console.error("Failed to fetch threads:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [archived, trashed, starred, filter]);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchThreads();
  };

  const updateThread = async (
    threadId: string,
    updates: Partial<Thread>
  ) => {
    try {
      await fetch(`/api/threads/${threadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      fetchThreads();
      router.refresh(); // Always refresh sidebar/counts after update
    } catch (error) {
      console.error("Failed to update thread:", error);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await fetch("/api/threads/mark-all-read", { method: "POST" });
      handleRefresh();
      router.refresh(); // Refresh sidebar counts
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  // Get selected thread for shortcuts
  const selectedThread = selectedIndex >= 0 ? threads[selectedIndex] : null;

  // Keyboard shortcuts
  useInboxShortcuts({
    onCompose: () => router.push("/compose"),
    onRefresh: handleRefresh,
    onSearch: () => {
      const input = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
      input?.focus();
    },
    onArchive: () => {
      if (selectedThread) {
        updateThread(selectedThread.id, { isArchived: true });
      }
    },
    onDelete: () => {
      if (selectedThread) {
        updateThread(selectedThread.id, { isTrashed: true });
      }
    },
    onStar: () => {
      if (selectedThread) {
        updateThread(selectedThread.id, { isStarred: !selectedThread.isStarred });
      }
    },
    onMarkRead: () => {
      if (selectedThread) {
        updateThread(selectedThread.id, { isRead: !selectedThread.isRead });
      }
    },
    onNextThread: () => {
      if (threads.length > 0) {
        const newIndex = Math.min(selectedIndex + 1, threads.length - 1);
        setSelectedIndex(newIndex);
        threadRefs.current[newIndex]?.scrollIntoView({ block: "nearest" });
      }
    },
    onPrevThread: () => {
      if (threads.length > 0) {
        const newIndex = Math.max(selectedIndex - 1, 0);
        setSelectedIndex(newIndex);
        threadRefs.current[newIndex]?.scrollIntoView({ block: "nearest" });
      }
    },
  });

  const getTitle = () => {
    if (filter === "sent") return "Sent";
    if (trashed) return "Trash";
    if (archived) return "Archived";
    if (starred) return "Starred";
    if (search) return `Search: ${search}`;
    return "Inbox";
  };

  return (
    <div className="h-full flex flex-col">
      <Header
        title={getTitle()}
        showSearch
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Inbox</h2>
          <button
            onClick={handleMarkAllAsRead}
            className="text-xs px-3 py-1 rounded bg-gray-100 dark:bg-gray-800 hover:bg-blue-500 hover:text-white dark:hover:bg-blue-600 transition-colors"
          >
            Mark all as read
          </button>
        </div>
        <ThreadList
          threads={threads}
          isLoading={isLoading || isRefreshing}
          selectedIndex={selectedIndex}
          onSelectIndex={setSelectedIndex}
          threadRefs={threadRefs}
          onStarThread={(id) => updateThread(id, { isStarred: true })}
          onArchiveThread={(id) => updateThread(id, { isArchived: true })}
          onTrashThread={(id) => updateThread(id, { isTrashed: true })}
        />
      </div>
    </div>
  );
}

export default function InboxPage() {
  return (
    <Suspense fallback={
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    }>
      <InboxContent />
    </Suspense>
  );
}
