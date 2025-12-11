"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { ThreadList } from "@/components/email/ThreadList";
import type { Thread, Label } from "@/lib/db/schema";

interface ThreadWithLabels extends Thread {
  labels: (Label & { appliedBy?: string | null; confidence?: number | null })[];
}

export default function LabelPage() {
  const params = useParams();
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
    } catch (error) {
      console.error("Failed to update thread:", error);
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
          isLoading={isLoading}
          onStarThread={(id) =>
            updateThread(id, {
              isStarred: !threads.find((t) => t.id === id)?.isStarred,
            })
          }
          onArchiveThread={(id) => updateThread(id, { isArchived: true })}
          onTrashThread={(id) => updateThread(id, { isTrashed: true })}
        />
      </div>
    </div>
  );
}
