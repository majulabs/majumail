"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { ThreadList } from "@/components/email/ThreadList";
import { useSSE } from "@/lib/hooks/useSSE";
import type { Thread, Label } from "@/lib/db/schema";

interface ThreadWithLabels extends Thread {
  labels: (Label & { appliedBy?: string | null; confidence?: number | null })[];
}

export default function LabelPage() {
  const params = useParams();
  const router = useRouter();
  const labelId = params.labelId as string;

  const [threads, setThreads] = useState<ThreadWithLabels[]>([]);
  const [labelName, setLabelName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchThreads = useCallback(async () => {
    try {
      const [threadsRes, labelRes] = await Promise.all([
        fetch(`/api/threads?labelId=${labelId}`),
        fetch(`/api/labels/${labelId}`),
      ]);

      const threadsData = await threadsRes.json();
      const labelData = await labelRes.json();

      setThreads(threadsData.threads || []);
      setLabelName(labelData.label?.name || "Label");
    } catch (error) {
      console.error("Failed to fetch threads:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [labelId]);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  // SSE refresh when new email arrives
  useSSE((event) => {
    if (event.type === "new_email" || event.type === "label_changed") {
      fetchThreads();
      router.refresh();
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
        title={labelName}
        showSearch
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />
      <div className="flex-1 overflow-y-auto">
        <ThreadList
          threads={threads}
          isLoading={isLoading || isRefreshing}
          onStarThread={handleStarThread}
          onArchiveThread={handleArchiveThread}
          onTrashThread={handleTrashThread}
        />
      </div>
    </div>
  );
}