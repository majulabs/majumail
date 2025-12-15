"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X, RefreshCw, Keyboard, Menu } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

interface HeaderProps {
  title?: string;
  showSearch?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

export function Header({
  title,
  showSearch = true,
  onRefresh,
  isRefreshing,
  onMenuClick,
  showMenuButton = true,
}: HeaderProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/inbox/search?q=${encodeURIComponent(searchQuery)}`);
      setIsSearchOpen(false);
    }
  };

  const closeSearch = () => {
    setSearchQuery("");
    setIsSearchFocused(false);
    setIsSearchOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      {/* Mobile Search Overlay */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 lg:hidden">
          <form onSubmit={handleSearch} className="flex items-center gap-2 p-4">
            <button
              type="button"
              onClick={closeSearch}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="h-5 w-5" />
            </button>
            <input
              type="text"
              placeholder="Search emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              className="flex-1 py-2 px-3 text-base bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="p-2 text-blue-500 hover:text-blue-600"
            >
              <Search className="h-5 w-5" />
            </button>
          </form>
        </div>
      )}

      {/* Main Header - h-14 (56px) to match sidebar header */}
      <div className="flex items-center justify-between gap-2 px-4 h-14 sm:px-6">
        {/* Left side - Menu button (mobile) + Title */}
        <div className="flex items-center gap-3 min-w-0">
          {showMenuButton && (
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 -ml-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors touch-target"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
          
          {title && !isSearchFocused && (
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
              {title}
            </h1>
          )}
        </div>

        {/* Center - Search (desktop only) */}
        {showSearch && (
          <form
            onSubmit={handleSearch}
            className={cn(
              "hidden lg:block relative transition-all",
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

        {/* Right side - Actions */}
        <div className="flex items-center gap-1">
          {/* Mobile search button */}
          {showSearch && (
            <button
              onClick={() => setIsSearchOpen(true)}
              className="lg:hidden p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors touch-target"
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </button>
          )}
          
          <ThemeToggle />
          
          {/* Keyboard shortcuts - desktop only */}
          <button
            onClick={() => document.dispatchEvent(new CustomEvent("show-shortcuts-modal"))}
            className="hidden lg:flex p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="Keyboard shortcuts (?)"
          >
            <Keyboard className="h-5 w-5" />
          </button>
          
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 touch-target"
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
  );
}