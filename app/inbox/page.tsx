"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { ThreadList } from "@/components/email/ThreadList";
import type { Thread, Label } from "@/lib/db/schema";
import { InboxSSERefresher } from "./InboxSSERefresher";

interface ThreadWithLabels extends Thread {
  labels: (Label & { appliedBy?: string | null; confidence?: number | null })[];
}

function InboxContent() {
  const [threads, setThreads] = useState<ThreadWithLabels[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const threadRefs = useRef<(HTMLDivElement | null)[]>([]);

  const fetchThreads = useCallback(async () => {
    try {
      const res = await fetch(`/api/threads`);
      const data = await res.json();
      setThreads(data.threads || []);
    } catch (error) {
      console.error("Failed to fetch inbox threads:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  const handleRefresh = () => {
    console.log("[Inbox] handleRefresh called");
    setIsRefreshing(true);
    fetchThreads();
  };

  const handleMarkAllRead = async () => {
    // Implement mark all as read logic here
  };

  return (
    <div className="h-full flex flex-col">
      <InboxSSERefresher refreshInbox={handleRefresh} />
      <Header
        title="Inbox"
        showSearch={true}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />
      <div className="px-4 py-2 flex justify-end">
        <button
          className="ml-2 px-3 py-1 rounded bg-blue-500 text-white hover:bg-blue-600 transition"
          onClick={handleMarkAllRead}
        >
          Mark all as read
        </button>
      </div>
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
