"use client";

import { useEffect, useCallback, useRef, useState } from "react";
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
        const keyMatch =
          event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrl
          ? event.ctrlKey || event.metaKey
          : !event.ctrlKey && !event.metaKey;
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

// Pre-built shortcuts hook for inbox with two-key sequence support
export function useInboxShortcuts(options: {
  onCompose?: () => void;
  onRefresh?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  onStar?: () => void;
  onMarkRead?: () => void;
  onNextThread?: () => void;
  onPrevThread?: () => void;
  onSwitchRole?: () => void;
  enabled?: boolean;
} = {}) {
  const {
    onCompose,
    onRefresh,
    onArchive,
    onDelete,
    onStar,
    onMarkRead,
    onNextThread,
    onPrevThread,
    onSwitchRole,
    enabled = true,
  } = options;

  const router = useRouter();
  const pendingKey = useRef<string | null>(null);
  const pendingTimeout = useRef<NodeJS.Timeout | null>(null);
  const [, forceUpdate] = useState({});

  // Clear pending key after timeout
  const clearPending = useCallback(() => {
    if (pendingTimeout.current) {
      clearTimeout(pendingTimeout.current);
    }
    pendingKey.current = null;
    forceUpdate({});
  }, []);

  // Handle 'g' prefix sequences
  const handleGSequence = useCallback(
    (key: string) => {
      switch (key) {
        case "i":
          router.push("/inbox");
          break;
        case "s":
          router.push("/sent");
          break;
        case "*":
          router.push("/starred");
          break;
        case "a":
          router.push("/archived");
          break;
        case "t":
          router.push("/trash");
          break;
        case "c":
          router.push("/contacts");
          break;
        case "u":
          onSwitchRole?.();
          break;
      }
    },
    [router, onSwitchRole]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        if (event.key === "Escape") {
          target.blur();
        }
        return;
      }

      const key = event.key;

      // Handle pending 'g' sequence
      if (pendingKey.current === "g") {
        clearPending();
        handleGSequence(key);
        return;
      }

      // Start 'g' sequence
      if (key === "g" && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
        event.preventDefault();
        pendingKey.current = "g";
        pendingTimeout.current = setTimeout(clearPending, 1000);
        forceUpdate({});
        return;
      }

      // Single key shortcuts
      // Note: "/" and Cmd+K are handled by the Header component for Spotlight search
      switch (key) {
        case "c":
          event.preventDefault();
          onCompose?.() ?? router.push("/compose");
          break;
        case "r":
          if (!event.shiftKey) {
            event.preventDefault();
            onRefresh?.();
          }
          break;
        case "e":
          event.preventDefault();
          onArchive?.();
          break;
        case "#":
          if (event.shiftKey) {
            event.preventDefault();
            onDelete?.();
          }
          break;
        case "s":
          event.preventDefault();
          onStar?.();
          break;
        case "u":
          event.preventDefault();
          onMarkRead?.();
          break;
        case "j":
          event.preventDefault();
          onNextThread?.();
          break;
        case "k":
          event.preventDefault();
          onPrevThread?.();
          break;
        case "?":
          if (event.shiftKey) {
            event.preventDefault();
            document.dispatchEvent(new CustomEvent("show-shortcuts-modal"));
          }
          break;
      }
    },
    [
      clearPending,
      handleGSequence,
      onCompose,
      onRefresh,
      onArchive,
      onDelete,
      onStar,
      onMarkRead,
      onNextThread,
      onPrevThread,
      router,
    ]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, handleKeyDown]);

  // Simple shortcuts list for reference
  const shortcuts = [
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
        document.dispatchEvent(new CustomEvent("show-shortcuts-modal"));
      },
    },
    {
      key: "Escape",
      description: "Close modal / Go back",
      action: () => {
        // Handled by individual components
      },
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
      { keys: ["g", "s"], description: "Go to Sent" },
      { keys: ["g", "*"], description: "Go to Starred" },
      { keys: ["g", "a"], description: "Go to Archive" },
      { keys: ["g", "t"], description: "Go to Trash" },
      { keys: ["g", "u"], description: "Switch Role" },
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
      { keys: ["/"], description: "Open Spotlight Search" },
      { keys: ["⌘", "K"], description: "Open Spotlight Search" },
      { keys: ["?"], description: "Show shortcuts" },
      { keys: ["Esc"], description: "Close modal" },
    ],
  },
];