"use client";

import { Suspense } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { ThreadList } from "@/components/email/ThreadList";
import { useThreadListPage } from "@/lib/hooks/useThreadListPage";
import { useInboxShortcuts } from "@/lib/hooks/useKeyboardShortcuts";

function StarredContent() {
  const router = useRouter();

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
  } = useThreadListPage({
    filter: "starred",
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
        title="Starred"
        showSearch
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />
      <div className="flex-1 overflow-y-auto">
        {!isLoading && threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500 dark:text-gray-400">
            <Star className="h-16 w-16 mb-4 opacity-50" />
            <p className="text-lg font-medium">No starred emails</p>
            <p className="text-sm">Star emails to find them easily later</p>
          </div>
        ) : (
          <ThreadList
            threads={threads}
            isLoading={isLoading}
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
          <div className="animate-pulse text-gray-500">Loading...</div>
        </div>
      }
    >
      <StarredContent />
    </Suspense>
  );
}