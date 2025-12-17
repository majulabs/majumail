"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ThreadView } from "@/components/email/ThreadView";
import { useCompose } from "@/components/providers/ComposeProvider";
import type { Thread, Email, Label, Mailbox } from "@/lib/db/schema";

interface ThreadWithRelations extends Thread {
  emails: Email[];
  labels: (Label & { appliedBy?: string | null; confidence?: number | null })[];
}

export default function ThreadPage() {
  const params = useParams();
  const router = useRouter();
  const threadId = params.threadId as string;
  const hasRefreshed = useRef(false);
  const { openCompose } = useCompose();

  const [thread, setThread] = useState<ThreadWithRelations | null>(null);
  const [allLabels, setAllLabels] = useState<Label[]>([]);
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchThread = useCallback(async () => {
    try {
      const [threadRes, labelsRes, mailboxesRes] = await Promise.all([
        fetch(`/api/threads/${threadId}`),
        fetch("/api/labels"),
        fetch("/api/mailboxes"),
      ]);

      const threadData = await threadRes.json();
      const labelsData = await labelsRes.json();
      const mailboxesData = await mailboxesRes.json();

      setThread(threadData.thread);
      setAllLabels(labelsData.labels || []);
      setMailboxes(mailboxesData.mailboxes || []);

      // Refresh server components once to update sidebar unread counts
      if (!hasRefreshed.current) {
        hasRefreshed.current = true;
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to fetch thread:", error);
    } finally {
      setIsLoading(false);
    }
  }, [threadId, router]);

  useEffect(() => {
    fetchThread();
  }, [fetchThread]);

  const updateThread = async (updates: Partial<Thread>) => {
    if (!thread) return;
    try {
      await fetch(`/api/threads/${threadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      setThread({ ...thread, ...updates });
    } catch (error) {
      console.error("Failed to update thread:", error);
    }
  };

  const addLabel = async (labelId: string) => {
    try {
      await fetch(`/api/threads/${threadId}/labels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labelId }),
      });
      fetchThread();
    } catch (error) {
      console.error("Failed to add label:", error);
    }
  };

  const removeLabel = async (labelId: string) => {
    try {
      await fetch(`/api/threads/${threadId}/labels?labelId=${labelId}`, {
        method: "DELETE",
      });
      fetchThread();
    } catch (error) {
      console.error("Failed to remove label:", error);
    }
  };

  // Handle reply - open the global compose modal with all necessary context
  const handleReply = () => {
    if (!thread) return;

    // Get the last email to reply to
    const lastEmail = thread.emails[thread.emails.length - 1];
    
    // Get reply-to address (from the last inbound email, or other participants)
    const lastInboundEmail = [...thread.emails]
      .reverse()
      .find((e) => e.direction === "inbound");
    
    const replyToAddress = lastInboundEmail
      ? lastInboundEmail.fromAddress
      : thread.participantAddresses?.find(
          (a) => !mailboxes.some((m) => m.address.toLowerCase() === a.toLowerCase())
        ) || "";

    // Build references header for proper email threading
    const references = lastEmail?.referencesHeader 
      ? [...lastEmail.referencesHeader]
      : [];
    
    if (lastEmail?.messageId && !references.includes(lastEmail.messageId)) {
      references.push(lastEmail.messageId);
    }

    // Open the compose modal with reply context
    openCompose({
      threadId,
      to: replyToAddress,
      subject: thread.subject?.startsWith("Re:")
        ? thread.subject
        : `Re: ${thread.subject || ""}`,
      replyTo: {
        from: replyToAddress,
        subject: thread.subject || "",
        messageId: lastEmail?.messageId || undefined,
        references,
      },
      previousEmails: thread.emails,
    });
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-500">
        <p>Thread not found</p>
        <button
          onClick={() => router.push("/inbox")}
          className="mt-4 text-blue-600 hover:text-blue-700"
        >
          Back to inbox
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Thread view */}
      <div className="flex-1 overflow-hidden">
        <ThreadView
          thread={thread}
          allLabels={allLabels}
          onStar={() => updateThread({ isStarred: !thread.isStarred })}
          onArchive={() => {
            updateThread({ isArchived: !thread.isArchived });
            router.push("/inbox");
          }}
          onTrash={async () => {
            if (thread.isTrashed) {
              await fetch(`/api/threads/${threadId}`, { method: "DELETE" });
              router.push("/inbox");
              router.refresh();
            } else {
              updateThread({ isTrashed: true });
              router.push("/inbox");
            }
          }}
          onAddLabel={addLabel}
          onRemoveLabel={removeLabel}
          onReply={handleReply}
        />
      </div>
    </div>
  );
}