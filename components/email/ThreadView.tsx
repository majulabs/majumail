"use client";

import { useState } from "react";
import { Star, Archive, Trash2, Reply, MoreHorizontal, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { EmailMessage } from "./EmailMessage";
import { LabelBadge } from "@/components/labels/LabelBadge";
import { LabelPicker } from "./LabelPicker";
import { Button } from "@/components/ui/Button";
import { Dropdown, DropdownItem, DropdownDivider } from "@/components/ui/Dropdown";
import { cn } from "@/lib/utils/cn";
import type { Thread, Email, Label } from "@/lib/db/schema";

interface ThreadWithRelations extends Thread {
  emails: Email[];
  labels: (Label & { appliedBy?: string | null; confidence?: number | null })[];
}

interface ThreadViewProps {
  thread: ThreadWithRelations;
  allLabels: Label[];
  onStar: () => void;
  onArchive: () => void;
  onTrash: () => void;
  onAddLabel: (labelId: string) => void;
  onRemoveLabel: (labelId: string) => void;
  onReply: () => void;
}

export function ThreadView({
  thread,
  allLabels,
  onStar,
  onArchive,
  onTrash,
  onAddLabel,
  onRemoveLabel,
  onReply,
}: ThreadViewProps) {
  const [expandedEmails, setExpandedEmails] = useState<Set<string>>(
    new Set([thread.emails[thread.emails.length - 1]?.id].filter(Boolean))
  );
  const router = useRouter();

  const toggleEmail = (emailId: string) => {
    setExpandedEmails((prev) => {
      const next = new Set(prev);
      if (next.has(emailId)) {
        next.delete(emailId);
      } else {
        next.add(emailId);
      }
      return next;
    });
  };

  const displayLabels = thread.labels.filter((l) => !l.isSystem);
  const selectedLabelIds = thread.labels.map((l) => l.id);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="shrink-0 px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        {/* Mobile back button */}
        <button
          onClick={() => router.push("/inbox")}
          className="lg:hidden flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to inbox
        </button>
        
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100 wrap-break-word">
              {thread.subject || "(No subject)"}
            </h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {displayLabels.map((label) => (
                <LabelBadge
                  key={label.id}
                  label={label}
                  onRemove={() => onRemoveLabel(label.id)}
                  showConfidence
                  size="md"
                />
              ))}
              <LabelPicker
                labels={allLabels}
                selectedLabelIds={selectedLabelIds}
                onToggle={(labelId) => {
                  if (selectedLabelIds.includes(labelId)) {
                    onRemoveLabel(labelId);
                  } else {
                    onAddLabel(labelId);
                  }
                }}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={onStar}
              className="p-2 text-gray-500 hover:text-yellow-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title={thread.isStarred ? "Unstar" : "Star"}
            >
              <Star
                className={cn(
                  "h-5 w-5",
                  thread.isStarred && "fill-yellow-500 text-yellow-500"
                )}
              />
            </button>
            <button
              onClick={onArchive}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title={thread.isArchived ? "Unarchive" : "Archive"}
            >
              <Archive className="h-5 w-5" />
            </button>
            <button
              onClick={onTrash}
              className="p-2 text-gray-500 hover:text-red-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title={thread.isTrashed ? "Restore" : "Move to trash"}
            >
              <Trash2 className="h-5 w-5" />
            </button>
            <Dropdown
              trigger={
                <button className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <MoreHorizontal className="h-5 w-5" />
                </button>
              }
            >
              <DropdownItem onClick={async () => {
                await fetch(`/api/threads/${thread.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ isRead: false }),
                });
                router.refresh();
              }}>
                Mark as unread
              </DropdownItem>
              <DropdownDivider />
              <DropdownItem onClick={onTrash} className="text-red-600">
                Delete permanently
              </DropdownItem>
            </Dropdown>
          </div>
        </div>
      </div>

      {/* Email Messages */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-4">
          {thread.emails.map((email) => (
            <EmailMessage
              key={email.id}
              email={email}
              isExpanded={expandedEmails.has(email.id)}
              onToggle={() => toggleEmail(email.id)}
            />
          ))}
        </div>
      </div>

      {/* Reply Footer */}
      <div className="shrink-0 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <Button onClick={onReply} className="w-full sm:w-auto">
          <Reply className="h-4 w-4 mr-2" />
          Reply
        </Button>
      </div>
    </div>
  );
}
