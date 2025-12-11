"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Shortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  meta?: boolean;
  alt?: boolean;
  description: string;
  action: () => void;
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  shortcuts?: Shortcut[];
}

// Default shortcuts for the email app
export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions = {}) {
  const { enabled = true, shortcuts = [] } = options;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        // Allow Escape to blur inputs
        if (event.key === "Escape") {
          target.blur();
        }
        return;
      }

      for (const shortcut of shortcuts) {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          event.preventDefault();
          shortcut.action();
          return;
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, handleKeyDown]);
}

// Pre-built shortcuts hook for inbox
export function useInboxShortcuts(options: {
  onCompose?: () => void;
  onRefresh?: () => void;
  onSearch?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  onStar?: () => void;
  onMarkRead?: () => void;
  onNextThread?: () => void;
  onPrevThread?: () => void;
  enabled?: boolean;
} = {}) {
  const router = useRouter();
  const {
    onCompose,
    onRefresh,
    onSearch,
    onArchive,
    onDelete,
    onStar,
    onMarkRead,
    onNextThread,
    onPrevThread,
    enabled = true,
  } = options;

  const shortcuts: Shortcut[] = [
    {
      key: "c",
      description: "Compose new email",
      action: () => onCompose?.() ?? router.push("/compose"),
    },
    {
      key: "r",
      description: "Refresh inbox",
      action: () => onRefresh?.(),
    },
    {
      key: "/",
      description: "Focus search",
      action: () => {
        onSearch?.();
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
        searchInput?.focus();
      },
    },
    {
      key: "e",
      description: "Archive selected",
      action: () => onArchive?.(),
    },
    {
      key: "#",
      shift: true,
      description: "Delete selected",
      action: () => onDelete?.(),
    },
    {
      key: "s",
      description: "Star/unstar selected",
      action: () => onStar?.(),
    },
    {
      key: "u",
      description: "Mark as read/unread",
      action: () => onMarkRead?.(),
    },
    {
      key: "j",
      description: "Next thread",
      action: () => onNextThread?.(),
    },
    {
      key: "k",
      description: "Previous thread",
      action: () => onPrevThread?.(),
    },
    {
      key: "?",
      shift: true,
      description: "Show keyboard shortcuts",
      action: () => {
        // Will be handled by the shortcuts modal
        document.dispatchEvent(new CustomEvent("show-shortcuts-modal"));
      },
    },
    {
      key: "Escape",
      description: "Close modal / Go back",
      action: () => {
        // Will be handled by individual components
      },
    },
    {
      key: "g",
      description: "Go to inbox (press twice)",
      action: () => router.push("/inbox"),
    },
  ];

  useKeyboardShortcuts({ enabled, shortcuts });

  return shortcuts;
}

// Shortcut display helper
export const SHORTCUT_GROUPS = [
  {
    name: "Navigation",
    shortcuts: [
      { keys: ["g", "i"], description: "Go to Inbox" },
      { keys: ["g", "s"], description: "Go to Starred" },
      { keys: ["g", "t"], description: "Go to Trash" },
      { keys: ["j"], description: "Next conversation" },
      { keys: ["k"], description: "Previous conversation" },
      { keys: ["Enter"], description: "Open conversation" },
      { keys: ["Esc"], description: "Go back / Close" },
    ],
  },
  {
    name: "Actions",
    shortcuts: [
      { keys: ["c"], description: "Compose new email" },
      { keys: ["r"], description: "Reply" },
      { keys: ["a"], description: "Reply all" },
      { keys: ["f"], description: "Forward" },
      { keys: ["e"], description: "Archive" },
      { keys: ["#"], description: "Delete" },
      { keys: ["s"], description: "Star / Unstar" },
      { keys: ["u"], description: "Mark read / unread" },
    ],
  },
  {
    name: "Application",
    shortcuts: [
      { keys: ["/"], description: "Search" },
      { keys: ["?"], description: "Show shortcuts" },
      { keys: ["Esc"], description: "Close modal" },
    ],
  },
];
