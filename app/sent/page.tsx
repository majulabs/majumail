"use client";

import { Suspense } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { ThreadList } from "@/components/email/ThreadList";
import { useThreadListPage } from "@/lib/hooks/useThreadListPage";
import { useInboxShortcuts } from "@/lib/hooks/useKeyboardShortcuts";
import { useRole } from "@/components/providers/RoleProvider";

function SentContent() {
  const router = useRouter();
  const { activeRole } = useRole();

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
    filter: "sent",
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
        title={`Sent - ${activeRole.name}`}
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
          emptyMessage={`No sent emails for ${activeRole.name}`}
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
          <div className="animate-pulse text-gray-500">Loading...</div>
        </div>
      }
    >
      <SentContent />
    </Suspense>
  );
}