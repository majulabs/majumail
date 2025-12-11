"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { ThreadList } from "@/components/email/ThreadList";
import type { Thread, Label } from "@/lib/db/schema";

interface ThreadWithLabels extends Thread {
  labels: (Label & { appliedBy?: string | null; confidence?: number | null })[];
}

function ArchivedContent() {
  const [threads, setThreads] = useState<ThreadWithLabels[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const threadRefs = useRef<(HTMLDivElement | null)[]>([]);

  const fetchThreads = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set("archived", "true");
      const res = await fetch(`/api/threads?${params.toString()}`);
      const data = await res.json();
      setThreads(data.threads || []);
    } catch (error) {
      console.error("Failed to fetch archived threads:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchThreads();
  };

  return (
    <div className="h-full flex flex-col">
      <Header
        title="Archived"
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
          onStarThread={() => {}}
          onArchiveThread={() => {}}
          onTrashThread={() => {}}
        />
      </div>
    </div>
  );
}

export default function ArchivedPage() {
  return (
    <Suspense fallback={
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    }>
      <ArchivedContent />
    </Suspense>
  );
}
