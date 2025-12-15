"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { ThreadList } from "@/components/email/ThreadList";
import { useThreadListPage } from "@/lib/hooks/useThreadListPage";

export default function LabelPage() {
  const params = useParams();
  const router = useRouter();
  const labelId = params.labelId as string;
  const [labelName, setLabelName] = useState<string>("Label");

  // Fetch label name
  useEffect(() => {
    const fetchLabelName = async () => {
      try {
        const res = await fetch(`/api/labels/${labelId}`);
        const data = await res.json();
        setLabelName(data.label?.name || "Label");
      } catch (error) {
        console.error("Failed to fetch label:", error);
      }
    };
    fetchLabelName();
  }, [labelId]);

  const {
    threads,
    isLoading,
    isRefreshing,
    handleRefresh,
    handleStarThread,
    handleArchiveThread,
    handleTrashThread,
  } = useThreadListPage({
    labelId,
    enableSSE: true,
    refreshAfterOperation: true,
  });

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
          emptyMessage={`No emails in ${labelName}`}
        />
      </div>
    </div>
  );
}