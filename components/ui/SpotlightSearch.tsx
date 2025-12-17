"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  Mail,
  User,
  Tag,
  Clock,
  ArrowRight,
  Loader2,
  Inbox,
  Send,
  Star,
  Archive,
  Trash2,
  Settings,
  Users,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface SearchResult {
  id: string;
  type: "thread" | "contact" | "label" | "navigation";
  title: string;
  subtitle?: string;
  icon?: React.ElementType;
  href: string;
  color?: string;
}

interface SpotlightSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

// Navigation items for quick access
const NAVIGATION_ITEMS: SearchResult[] = [
  { id: "nav-inbox", type: "navigation", title: "Inbox", icon: Inbox, href: "/inbox" },
  { id: "nav-sent", type: "navigation", title: "Sent", icon: Send, href: "/sent" },
  { id: "nav-starred", type: "navigation", title: "Starred", icon: Star, href: "/starred" },
  { id: "nav-archived", type: "navigation", title: "Archived", icon: Archive, href: "/archived" },
  { id: "nav-trash", type: "navigation", title: "Trash", icon: Trash2, href: "/trash" },
  { id: "nav-contacts", type: "navigation", title: "Contacts", icon: Users, href: "/contacts" },
  { id: "nav-settings", type: "navigation", title: "Settings", icon: Settings, href: "/settings" },
];

export function SpotlightSearch({ isOpen, onClose }: SpotlightSearchProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Load recent searches from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("majumail-recent-searches");
      if (stored) {
        try {
          setRecentSearches(JSON.parse(stored));
        } catch {
          // Ignore parse errors
        }
      }
    }
  }, []);

  // Save recent search
  const saveRecentSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    setRecentSearches((prev) => {
      const updated = [searchQuery, ...prev.filter((s) => s !== searchQuery)].slice(0, 5);
      localStorage.setItem("majumail-recent-searches", JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setSelectedIndex(0);
      setResults([]);
    }
  }, [isOpen]);

  // Search function
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);

    try {
      // Filter navigation items
      const navResults = NAVIGATION_ITEMS.filter(
        (item) =>
          item.title.toLowerCase().includes(searchQuery.toLowerCase())
      );

      // Search threads
      const threadRes = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&limit=5`);
      const threadData = await threadRes.json();
      
      const threadResults: SearchResult[] = (threadData.threads || []).map((thread: {
        id: string;
        subject: string | null;
        snippet: string | null;
      }) => ({
        id: `thread-${thread.id}`,
        type: "thread" as const,
        title: thread.subject || "(No subject)",
        subtitle: thread.snippet || "",
        icon: Mail,
        href: `/inbox/${thread.id}`,
      }));

      // Search contacts
      let contactResults: SearchResult[] = [];
      try {
        const contactRes = await fetch(`/api/contacts/search?q=${encodeURIComponent(searchQuery)}&limit=5`);
        if (contactRes.ok) {
          const contactData = await contactRes.json();
          contactResults = (contactData.contacts || []).map((contact: {
            id: string;
            name: string | null;
            email: string;
            company: string | null;
          }) => ({
            id: `contact-${contact.id}`,
            type: "contact" as const,
            title: contact.name || contact.email,
            subtitle: contact.name ? contact.email : contact.company || "",
            icon: User,
            href: `/contacts?selected=${contact.id}`,
          }));
        }
      } catch {
        // Contacts search failed, continue without
      }

      // Combine results with navigation first, then threads, then contacts
      setResults([...navResults, ...threadResults, ...contactResults]);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 200);

    return () => clearTimeout(timer);
  }, [query, performSearch]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < results.length - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case "Enter":
          e.preventDefault();
          if (results[selectedIndex]) {
            handleSelect(results[selectedIndex]);
          } else if (query.trim()) {
            // Navigate to search page
            saveRecentSearch(query);
            router.push(`/inbox/search?q=${encodeURIComponent(query)}`);
            onClose();
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, results, selectedIndex, query, router, onClose, saveRecentSearch]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  const handleSelect = (result: SearchResult) => {
    if (result.type === "thread" || result.type === "contact") {
      saveRecentSearch(query);
    }
    router.push(result.href);
    onClose();
  };

  const handleRecentSearchClick = (search: string) => {
    setQuery(search);
    performSearch(search);
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem("majumail-recent-searches");
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-4 top-[15%] z-50 mx-auto max-w-2xl">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl ring-1 ring-black/10 dark:ring-white/10 overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
            <Search className="h-5 w-5 text-gray-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search emails, contacts, and more..."
              className="flex-1 bg-transparent text-base text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none"
            />
            {isSearching && (
              <Loader2 className="h-5 w-5 text-gray-400 animate-spin shrink-0" />
            )}
            {query && !isSearching && (
              <button
                onClick={() => setQuery("")}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <kbd className="hidden sm:inline-flex items-center px-2 py-1 text-xs font-medium text-gray-400 bg-gray-100 dark:bg-gray-800 rounded">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-[60vh] overflow-y-auto">
            {/* Empty state - show recent searches or quick navigation */}
            {!query && (
              <div className="p-2">
                {recentSearches.length > 0 && (
                  <div className="mb-2">
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Recent Searches
                      </span>
                      <button
                        onClick={clearRecentSearches}
                        className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        Clear
                      </button>
                    </div>
                    {recentSearches.map((search, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleRecentSearchClick(search)}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      >
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {search}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                <div>
                  <div className="px-3 py-2">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Quick Navigation
                    </span>
                  </div>
                  {NAVIGATION_ITEMS.slice(0, 5).map((item, idx) => {
                    const Icon = item.icon || FileText;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                          idx === selectedIndex && !query
                            ? "bg-blue-50 dark:bg-blue-900/20"
                            : "hover:bg-gray-100 dark:hover:bg-gray-800"
                        )}
                      >
                        <Icon className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {item.title}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Search results */}
            {query && results.length > 0 && (
              <div className="p-2">
                {/* Group results by type */}
                {["navigation", "thread", "contact"].map((type) => {
                  const typeResults = results.filter((r) => r.type === type);
                  if (typeResults.length === 0) return null;

                  const typeLabels: Record<string, string> = {
                    navigation: "Navigation",
                    thread: "Emails",
                    contact: "Contacts",
                  };

                  return (
                    <div key={type} className="mb-2">
                      <div className="px-3 py-2">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          {typeLabels[type]}
                        </span>
                      </div>
                      {typeResults.map((result) => {
                        const globalIndex = results.indexOf(result);
                        const Icon = result.icon || FileText;
                        return (
                          <button
                            key={result.id}
                            onClick={() => handleSelect(result)}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group",
                              globalIndex === selectedIndex
                                ? "bg-blue-50 dark:bg-blue-900/20"
                                : "hover:bg-gray-100 dark:hover:bg-gray-800"
                            )}
                          >
                            <div
                              className={cn(
                                "flex items-center justify-center h-8 w-8 rounded-lg shrink-0",
                                result.type === "thread"
                                  ? "bg-blue-100 dark:bg-blue-900/30"
                                  : result.type === "contact"
                                  ? "bg-green-100 dark:bg-green-900/30"
                                  : "bg-gray-100 dark:bg-gray-800"
                              )}
                            >
                              <Icon
                                className={cn(
                                  "h-4 w-4",
                                  result.type === "thread"
                                    ? "text-blue-600 dark:text-blue-400"
                                    : result.type === "contact"
                                    ? "text-green-600 dark:text-green-400"
                                    : "text-gray-500 dark:text-gray-400"
                                )}
                              />
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                {result.title}
                              </div>
                              {result.subtitle && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                  {result.subtitle}
                                </div>
                              )}
                            </div>
                            <ArrowRight className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}

            {/* No results */}
            {query && !isSearching && results.length === 0 && (
              <div className="px-4 py-8 text-center">
                <Search className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No results for &quot;{query}&quot;
                </p>
                <button
                  onClick={() => {
                    saveRecentSearch(query);
                    router.push(`/inbox/search?q=${encodeURIComponent(query)}`);
                    onClose();
                  }}
                  className="mt-3 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Search all emails →
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">↑</kbd>
                  <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">↓</kbd>
                  to navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">↵</kbd>
                  to select
                </span>
              </div>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">/</kbd>
                to search
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}