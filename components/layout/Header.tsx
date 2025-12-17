"use client";

import { useState, useEffect } from "react";
import { Search, RefreshCw, Keyboard } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { SpotlightSearch } from "@/components/ui/SpotlightSearch";

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
  const [isSpotlightOpen, setIsSpotlightOpen] = useState(false);

  // Global keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open spotlight with "/" key (when not typing in an input)
      if (
        e.key === "/" &&
        !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName) &&
        !(e.target as HTMLElement).isContentEditable
      ) {
        e.preventDefault();
        setIsSpotlightOpen(true);
      }
      
      // Also support Cmd/Ctrl + K
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSpotlightOpen(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        {/* Main Header - h-14 (56px) to match sidebar header */}
        <div className="flex items-center justify-between gap-2 px-4 h-14 sm:px-6">
          {/* Left side - Title */}
          <div className="flex items-center gap-3 min-w-0">
            {title && (
              <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                {title}
              </h1>
            )}
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center gap-1">
            {/* Search button - triggers spotlight */}
            {showSearch && (
              <button
                onClick={() => setIsSpotlightOpen(true)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                title="Search (/ or ⌘K)"
              >
                <Search className="h-5 w-5" />
              </button>
            )}

            <ThemeToggle />

            {/* Keyboard shortcuts - desktop only */}
            <button
              onClick={() =>
                document.dispatchEvent(new CustomEvent("show-shortcuts-modal"))
              }
              className="hidden lg:flex p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="Keyboard shortcuts (?)"
            >
              <Keyboard className="h-5 w-5" />
            </button>

            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw
                  className={cn("h-5 w-5", isRefreshing && "animate-spin")}
                />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Spotlight Search Modal */}
      <SpotlightSearch
        isOpen={isSpotlightOpen}
        onClose={() => setIsSpotlightOpen(false)}
      />
    </>
  );
}