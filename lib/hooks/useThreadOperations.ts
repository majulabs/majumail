"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

interface ThreadOperationsOptions {
  /** Callback after successful operation */
  onSuccess?: (threadId: string, operation: string) => void;
  /** Callback after failed operation */
  onError?: (threadId: string, operation: string, error: Error) => void;
  /** Whether to refresh router after operations */
  refreshAfterOperation?: boolean;
}

interface ThreadOperations {
  /** Toggle star status */
  starThread: (threadId: string, currentIsStarred: boolean) => Promise<boolean>;
  /** Archive a thread */
  archiveThread: (threadId: string) => Promise<boolean>;
  /** Move thread to trash */
  trashThread: (threadId: string) => Promise<boolean>;
  /** Restore from trash or archive */
  restoreThread: (threadId: string, fromTrash?: boolean) => Promise<boolean>;
  /** Permanently delete a thread */
  deleteThread: (threadId: string) => Promise<boolean>;
  /** Mark thread as read */
  markAsRead: (threadId: string) => Promise<boolean>;
  /** Mark thread as unread */
  markAsUnread: (threadId: string) => Promise<boolean>;
  /** Mark as not spam (remove spam label, add to inbox) */
  markAsNotSpam: (threadId: string) => Promise<boolean>;
  /** Generic update function */
  updateThread: (threadId: string, updates: Record<string, unknown>) => Promise<boolean>;
}

/**
 * Hook for common thread operations
 * Centralizes all thread mutation logic to avoid duplication
 */
export function useThreadOperations(options: ThreadOperationsOptions = {}): ThreadOperations {
  const router = useRouter();
  const { onSuccess, onError, refreshAfterOperation = false } = options;

  const handleSuccess = useCallback((threadId: string, operation: string) => {
    onSuccess?.(threadId, operation);
    if (refreshAfterOperation) {
      router.refresh();
    }
  }, [onSuccess, refreshAfterOperation, router]);

  const handleError = useCallback((threadId: string, operation: string, error: Error) => {
    console.error(`Failed to ${operation} thread ${threadId}:`, error);
    onError?.(threadId, operation, error);
  }, [onError]);

  const updateThread = useCallback(async (
    threadId: string,
    updates: Record<string, unknown>
  ): Promise<boolean> => {
    try {
      const res = await fetch(`/api/threads/${threadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      handleSuccess(threadId, "update");
      return true;
    } catch (error) {
      handleError(threadId, "update", error as Error);
      return false;
    }
  }, [handleSuccess, handleError]);

  const starThread = useCallback(async (
    threadId: string,
    currentIsStarred: boolean
  ): Promise<boolean> => {
    try {
      const res = await fetch(`/api/threads/${threadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isStarred: !currentIsStarred }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      handleSuccess(threadId, "star");
      return true;
    } catch (error) {
      handleError(threadId, "star", error as Error);
      return false;
    }
  }, [handleSuccess, handleError]);

  const archiveThread = useCallback(async (threadId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/threads/${threadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: true }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      handleSuccess(threadId, "archive");
      return true;
    } catch (error) {
      handleError(threadId, "archive", error as Error);
      return false;
    }
  }, [handleSuccess, handleError]);

  const trashThread = useCallback(async (threadId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/threads/${threadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isTrashed: true }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      handleSuccess(threadId, "trash");
      return true;
    } catch (error) {
      handleError(threadId, "trash", error as Error);
      return false;
    }
  }, [handleSuccess, handleError]);

  const restoreThread = useCallback(async (
    threadId: string,
    fromTrash: boolean = true
  ): Promise<boolean> => {
    try {
      const updates = fromTrash 
        ? { isTrashed: false } 
        : { isArchived: false };

      const res = await fetch(`/api/threads/${threadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      handleSuccess(threadId, "restore");
      return true;
    } catch (error) {
      handleError(threadId, "restore", error as Error);
      return false;
    }
  }, [handleSuccess, handleError]);

  const deleteThread = useCallback(async (threadId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/threads/${threadId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      handleSuccess(threadId, "delete");
      return true;
    } catch (error) {
      handleError(threadId, "delete", error as Error);
      return false;
    }
  }, [handleSuccess, handleError]);

  const markAsRead = useCallback(async (threadId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/threads/${threadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      handleSuccess(threadId, "markAsRead");
      return true;
    } catch (error) {
      handleError(threadId, "markAsRead", error as Error);
      return false;
    }
  }, [handleSuccess, handleError]);

  const markAsUnread = useCallback(async (threadId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/threads/${threadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: false }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      handleSuccess(threadId, "markAsUnread");
      return true;
    } catch (error) {
      handleError(threadId, "markAsUnread", error as Error);
      return false;
    }
  }, [handleSuccess, handleError]);

  const markAsNotSpam = useCallback(async (threadId: string): Promise<boolean> => {
    try {
      // Remove Spam label
      const res = await fetch(`/api/threads/${threadId}/labels/spam`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      handleSuccess(threadId, "markAsNotSpam");
      return true;
    } catch (error) {
      handleError(threadId, "markAsNotSpam", error as Error);
      return false;
    }
  }, [handleSuccess, handleError]);

  return {
    starThread,
    archiveThread,
    trashThread,
    restoreThread,
    deleteThread,
    markAsRead,
    markAsUnread,
    markAsNotSpam,
    updateThread,
  };
}