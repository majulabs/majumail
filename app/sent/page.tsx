"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { ThreadList } from "@/components/email/ThreadList";
import { useSSE } from "@/lib/hooks/useSSE";
import type { Thread, Label } from "@/lib/db/schema";

interface ThreadWithLabels extends Thread {
  labels: (Label & { appliedBy?: string | null; confidence?: number | null })[];
}

function SentContent() {
  const router = useRouter();
  const [threads, setThreads] = useState<ThreadWithLabels[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const threadRefs = useRef<(HTMLDivElement | null)[]>([]);

  const fetchThreads = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set("filter", "sent");
      const res = await fetch(`/api/threads?${params.toString()}`);
      const data = await res.json();
      setThreads(data.threads || []);
    } catch (error) {
      console.error("Failed to fetch sent threads:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  // SSE refresh when email is sent
  useSSE((event) => {
    if (event.type === "new_email") {
      fetchThreads();
    }
  });

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchThreads();
  };

  const handleStarThread = async (threadId: string) => {
    const thread = threads.find((t) => t.id === threadId);
    if (!thread) return;

    try {
      await fetch(`/api/threads/${threadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isStarred: !thread.isStarred }),
      });
      setThreads((prev) =>
        prev.map((t) =>
          t.id === threadId ? { ...t, isStarred: !t.isStarred } : t
        )
      );
    } catch (error) {
      console.error("Failed to star thread:", error);
    }
  };

  const handleArchiveThread = async (threadId: string) => {
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
    }
  };

  const handleTrashThread = async (threadId: string) => {
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
    }
  };

  return (
    <div className="h-full flex flex-col">
      <Header
        title="Sent"
        showSearch={true}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />
      <div className="flex-1 overflow-y-auto">
        <ThreadList
          threads={threads}
          isLoading={isLoading || isRefreshing}
          selectedIndex={selectedIndex}
          onSelectIndex={setSelectedIndex}
          threadRefs={threadRefs}
          onStarThread={handleStarThread}
          onArchiveThread={handleArchiveThread}
          onTrashThread={handleTrashThread}
        />
      </div>
    </div>
  );
}

export default function SentPage() {
  return (
    <Suspense
      fallback={
        <div className="h-full flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
        </div>
      }
    >
      <SentContent />
    </Suspense>
  );
}