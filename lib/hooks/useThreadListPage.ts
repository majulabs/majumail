"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSSE } from "./useSSE";
import { useThreadOperations } from "./useThreadOperations";
import { useRole } from "@/components/providers/RoleProvider";
import type { ThreadWithLabels, ThreadFilter } from "@/lib/types";

interface UseThreadListPageOptions {
  /** Filter type for the thread list */
  filter?: ThreadFilter;
  /** Specific label ID to filter by */
  labelId?: string;
  /** Whether to enable SSE updates */
  enableSSE?: boolean;
  /** Whether to refresh router after operations */
  refreshAfterOperation?: boolean;
  /** Debounce time for SSE updates (ms) */
  sseDebounceMs?: number;
}

interface UseThreadListPageReturn {
  /** Current list of threads */
  threads: ThreadWithLabels[];
  /** Whether initial load is in progress */
  isLoading: boolean;
  /** Whether refresh is in progress */
  isRefreshing: boolean;
  /** Currently selected thread index */
  selectedIndex: number;
  /** Refs for thread elements (for keyboard navigation) */
  threadRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  /** Set the selected index */
  setSelectedIndex: (index: number) => void;
  /** Refresh the thread list */
  handleRefresh: () => void;
  /** Star/unstar a thread */
  handleStarThread: (threadId: string) => Promise<void>;
  /** Archive a thread */
  handleArchiveThread: (threadId: string) => Promise<void>;
  /** Move thread to trash */
  handleTrashThread: (threadId: string) => Promise<void>;
  /** Restore a thread from trash or archive */
  handleRestoreThread: (threadId: string, fromTrash?: boolean) => Promise<void>;
  /** Permanently delete a thread */
  handleDeleteThread: (threadId: string) => Promise<void>;
  /** Mark thread as not spam */
  handleMarkAsNotSpam: (threadId: string) => Promise<void>;
  /** Mark all threads as read */
  handleMarkAllRead: () => Promise<void>;
  /** Empty trash (delete all trashed threads) */
  handleEmptyTrash: () => Promise<void>;
  /** Empty spam (delete all spam threads) */
  handleEmptySpam: () => Promise<void>;
  /** Update threads state directly (for optimistic updates) */
  setThreads: React.Dispatch<React.SetStateAction<ThreadWithLabels[]>>;
}

/**
 * Hook for thread list pages
 * Encapsulates common logic for inbox, sent, starred, archived, trash, spam pages
 * Automatically filters by the active role's mailbox
 */
export function useThreadListPage(
  options: UseThreadListPageOptions = {}
): UseThreadListPageReturn {
  const {
    filter,
    labelId,
    enableSSE = true,
    refreshAfterOperation = true,
    sseDebounceMs = 2000,
  } = options;

  const router = useRouter();
  const { activeMailboxAddress, activeRoleId } = useRole();
  const [threads, setThreads] = useState<ThreadWithLabels[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const threadRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Track recent local changes to prevent SSE from overwriting them
  const recentChangesRef = useRef<Set<string>>(new Set());

  // Helper to mark a thread as recently changed
  const markRecentChange = useCallback(
    (threadId: string) => {
      recentChangesRef.current.add(threadId);
      setTimeout(() => {
        recentChangesRef.current.delete(threadId);
      }, sseDebounceMs);
    },
    [sseDebounceMs]
  );

  // Thread operations
  const threadOps = useThreadOperations({
    refreshAfterOperation,
    onError: (threadId) => {
      // On error, clear the recent change flag and refresh
      recentChangesRef.current.delete(threadId);
      fetchThreads();
    },
  });

  // Build fetch URL based on options - includes role filter
  const buildFetchUrl = useCallback(() => {
    const params = new URLSearchParams();

    if (filter) {
      params.set("filter", filter);
    }

    if (labelId) {
      params.set("labelId", labelId);
    }

    // Add role filter - filter by the active mailbox
    if (activeMailboxAddress) {
      params.set("roleMailbox", activeMailboxAddress);
    }

    const queryString = params.toString();
    return queryString ? `/api/threads?${queryString}` : "/api/threads";
  }, [filter, labelId, activeMailboxAddress]);

  // Fetch threads
  const fetchThreads = useCallback(async () => {
    try {
      const url = buildFetchUrl();
      const res = await fetch(url);
      const data = await res.json();
      setThreads(data.threads || []);
    } catch (error) {
      console.error("Failed to fetch threads:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [buildFetchUrl]);

  // Initial fetch and refetch when role changes
  useEffect(() => {
    setIsLoading(true);
    fetchThreads();
  }, [fetchThreads, activeRoleId]);

  // SSE handler
  useSSE(
    (event) => {
      if (
        event.type === "new_email" ||
        event.type === "thread_updated" ||
        event.type === "label_changed"
      ) {
        const threadId = event.data?.threadId;

        // Skip SSE-triggered refresh if we just made a local change
        if (threadId && recentChangesRef.current.has(threadId)) {
          return;
        }

        fetchThreads();
        if (refreshAfterOperation) {
          router.refresh();
        }
      }
    },
    enableSSE
  );

  // Manual refresh
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    recentChangesRef.current.clear();
    fetchThreads();
  }, [fetchThreads]);

  // Star/unstar thread
  const handleStarThread = useCallback(
    async (threadId: string) => {
      const thread = threads.find((t) => t.id === threadId);
      if (!thread) return;

      markRecentChange(threadId);

      const success = await threadOps.starThread(threadId, !!thread.isStarred);

      if (success) {
        // Optimistic update for star toggle
        setThreads((prev) =>
          prev.map((t) =>
            t.id === threadId ? { ...t, isStarred: !t.isStarred } : t
          )
        );

        // For starred filter, remove if unstarring
        if (filter === "starred" && thread.isStarred) {
          setThreads((prev) => prev.filter((t) => t.id !== threadId));
        }
      }
    },
    [threads, markRecentChange, threadOps, filter]
  );

  // Archive thread
  const handleArchiveThread = useCallback(
    async (threadId: string) => {
      markRecentChange(threadId);

      const success = await threadOps.archiveThread(threadId);

      if (success) {
        // Remove from current view (except archived view)
        if (filter !== "archived") {
          setThreads((prev) => prev.filter((t) => t.id !== threadId));
        }
        router.refresh();
      }
    },
    [markRecentChange, threadOps, filter, router]
  );

  // Trash thread
  const handleTrashThread = useCallback(
    async (threadId: string) => {
      markRecentChange(threadId);

      const success = await threadOps.trashThread(threadId);

      if (success) {
        // Remove from current view (except trash view)
        if (filter !== "trash") {
          setThreads((prev) => prev.filter((t) => t.id !== threadId));
        }
        router.refresh();
      }
    },
    [markRecentChange, threadOps, filter, router]
  );

  // Restore thread
  const handleRestoreThread = useCallback(
    async (threadId: string, fromTrash: boolean = true) => {
      markRecentChange(threadId);

      const success = await threadOps.restoreThread(threadId, fromTrash);

      if (success) {
        // Remove from current view (trash or archived)
        setThreads((prev) => prev.filter((t) => t.id !== threadId));
        router.refresh();
      }
    },
    [markRecentChange, threadOps, router]
  );

  // Delete thread permanently
  const handleDeleteThread = useCallback(
    async (threadId: string) => {
      markRecentChange(threadId);

      const success = await threadOps.deleteThread(threadId);

      if (success) {
        setThreads((prev) => prev.filter((t) => t.id !== threadId));
        router.refresh();
      }
    },
    [markRecentChange, threadOps, router]
  );

  // Mark as not spam
  const handleMarkAsNotSpam = useCallback(
    async (threadId: string) => {
      markRecentChange(threadId);

      const success = await threadOps.markAsNotSpam(threadId);

      if (success) {
        // Remove from spam view
        setThreads((prev) => prev.filter((t) => t.id !== threadId));
        router.refresh();
      }
    },
    [markRecentChange, threadOps, router]
  );

  // Mark all as read
  const handleMarkAllRead = useCallback(async () => {
    const unreadThreads = threads.filter((t) => !t.isRead);

    await Promise.all(
      unreadThreads.map((thread) => threadOps.markAsRead(thread.id))
    );

    // Update local state
    setThreads((prev) => prev.map((t) => ({ ...t, isRead: true })));
    router.refresh();
  }, [threads, threadOps, router]);

  // Empty trash
  const handleEmptyTrash = useCallback(async () => {
    try {
      await fetch("/api/threads/delete-all-trashed", {
        method: "DELETE",
      });
      setThreads([]);
      router.refresh();
    } catch (error) {
      console.error("Failed to empty trash:", error);
    }
  }, [router]);

  // Empty spam
  const handleEmptySpam = useCallback(async () => {
    try {
      // Delete all spam threads one by one
      for (const thread of threads) {
        await threadOps.deleteThread(thread.id);
      }
      setThreads([]);
      router.refresh();
    } catch (error) {
      console.error("Failed to empty spam:", error);
    }
  }, [threads, threadOps, router]);

  return {
    threads,
    isLoading,
    isRefreshing,
    selectedIndex,
    threadRefs,
    setSelectedIndex,
    handleRefresh,
    handleStarThread,
    handleArchiveThread,
    handleTrashThread,
    handleRestoreThread,
    handleDeleteThread,
    handleMarkAsNotSpam,
    handleMarkAllRead,
    handleEmptyTrash,
    handleEmptySpam,
    setThreads,
  };
}