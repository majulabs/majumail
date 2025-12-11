"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { SHORTCUT_GROUPS } from "@/hooks/useKeyboardShortcuts";

export function KeyboardShortcutsModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleShow = () => setIsOpen(true);
    document.addEventListener("show-shortcuts-modal", handleShow);
    return () => document.removeEventListener("show-shortcuts-modal", handleShow);
  }, []);

  return (
    <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Keyboard Shortcuts">
      <div className="space-y-6 max-h-[60vh] overflow-y-auto">
        {SHORTCUT_GROUPS.map((group) => (
          <div key={group.name}>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
              {group.name}
            </h3>
            <div className="space-y-2">
              {group.shortcuts.map((shortcut, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-1"
                >
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {shortcut.description}
                  </span>
                  <div className="flex items-center gap-1">
                    {shortcut.keys.map((key, keyIdx) => (
                      <kbd
                        key={keyIdx}
                        className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded border border-gray-200 dark:border-gray-600"
                      >
                        {key}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Press <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">?</kbd> to show this dialog
        </p>
      </div>
    </Modal>
  );
}
