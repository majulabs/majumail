"use client";

import { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { ThreadList } from "@/components/email/ThreadList";
import { useThreadListPage } from "@/lib/hooks/useThreadListPage";
import { useInboxShortcuts } from "@/lib/hooks/useKeyboardShortcuts";

function InboxContent() {
  const {
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
    handleMarkAllRead,
  } = useThreadListPage({
    filter: "inbox",
    enableSSE: true,
    refreshAfterOperation: true,
  });

  // Keyboard shortcuts
  useInboxShortcuts({
    onStar: () => {
      const threadId = threads[selectedIndex]?.id;
      if (threadId) handleStarThread(threadId);
    },
    onArchive: () => {
      const threadId = threads[selectedIndex]?.id;
      if (threadId) handleArchiveThread(threadId);
    },
    onDelete: () => {
      const threadId = threads[selectedIndex]?.id;
      if (threadId) handleTrashThread(threadId);
    },
  });

  return (
    <div className="h-full flex flex-col">
      <Header
        title="Inbox"
        showSearch
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />
      <div className="flex-1 overflow-y-auto">
        <ThreadList
          threads={threads}
          isLoading={isLoading}
          selectedIndex={selectedIndex}
          onSelectIndex={setSelectedIndex}
          threadRefs={threadRefs}
          onStarThread={handleStarThread}
          onArchiveThread={handleArchiveThread}
          onTrashThread={handleTrashThread}
          emptyMessage="Your inbox is empty"
        />
      </div>
    </div>
  );
}

export default function InboxPage() {
  return (
    <Suspense
      fallback={
        <div className="h-full flex items-center justify-center">
          <div className="animate-pulse text-gray-500">Loading...</div>
        </div>
      }
    >
      <InboxContent />
    </Suspense>
  );
}