"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { ThreadList } from "@/components/email/ThreadList";
import { Search, ArrowLeft } from "lucide-react";
import type { Thread, Label } from "@/lib/db/schema";

interface ThreadWithLabels extends Thread {
  labels: Label[];
}

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get("q") || "";
  
  const [threads, setThreads] = useState<ThreadWithLabels[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [total, setTotal] = useState(0);

  const searchThreads = useCallback(async () => {
    if (!query.trim()) {
      setThreads([]);
      setTotal(0);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setThreads(data.threads || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  useEffect(() => {
    searchThreads();
  }, [searchThreads]);

  const updateThread = async (threadId: string, updates: Partial<Thread>) => {
    try {
      await fetch(`/api/threads/${threadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      searchThreads();
    } catch (error) {
      console.error("Failed to update thread:", error);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <Header title={query ? `Search: "${query}"` : "Search"} showSearch />
      
      <div className="flex-1 overflow-y-auto">
        {!query ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500 dark:text-gray-400">
            <Search className="h-16 w-16 mb-4 opacity-50" />
            <p className="text-lg font-medium">Search your emails</p>
            <p className="text-sm">Enter a search term above to find emails</p>
          </div>
        ) : isLoading ? (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-4 py-3 animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2" />
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-2" />
                    <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-64" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500 dark:text-gray-400">
            <Search className="h-16 w-16 mb-4 opacity-50" />
            <p className="text-lg font-medium">No results found</p>
            <p className="text-sm">Try different keywords or check your spelling</p>
            <button
              onClick={() => router.push("/inbox")}
              className="mt-4 flex items-center gap-2 text-blue-600 hover:text-blue-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to inbox
            </button>
          </div>
        ) : (
          <>
            <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
              {total} result{total !== 1 ? "s" : ""} for &quot;{query}&quot;
            </div>
            <ThreadList
              threads={threads}
              isLoading={false}
              onStarThread={(id) =>
                updateThread(id, {
                  isStarred: !threads.find((t) => t.id === id)?.isStarred,
                })
              }
              onArchiveThread={(id) => updateThread(id, { isArchived: true })}
              onTrashThread={(id) => updateThread(id, { isTrashed: true })}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-4">Loading...</div>}>
      <SearchContent />
    </Suspense>
  );
}
