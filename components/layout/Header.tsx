"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X, RefreshCw, Keyboard } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

interface HeaderProps {
  title?: string;
  showSearch?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function Header({
  title,
  showSearch = true,
  onRefresh,
  isRefreshing,
}: HeaderProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/inbox/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 px-6 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      {/* Title or Search */}
      <div className="flex items-center gap-4 flex-1">
        {title && !isSearchFocused && (
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h1>
        )}
        {showSearch && (
          <form
            onSubmit={handleSearch}
            className={cn(
              "relative transition-all",
              isSearchFocused ? "flex-1 max-w-xl" : "w-64"
            )}
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => {
                if (!searchQuery) setIsSearchFocused(false);
              }}
              className="w-full pl-10 pr-10 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setIsSearchFocused(false);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </form>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <button
          onClick={() => document.dispatchEvent(new CustomEvent("show-shortcuts-modal"))}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          title="Keyboard shortcuts (?)"
        >
          <Keyboard className="h-5 w-5" />
        </button>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh (r)"
          >
            <RefreshCw
              className={cn("h-5 w-5", isRefreshing && "animate-spin")}
            />
          </button>
        )}
      </div>
    </header>
  );
}
