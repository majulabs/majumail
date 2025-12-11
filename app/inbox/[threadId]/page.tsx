"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ThreadView } from "@/components/email/ThreadView";
import { ComposeForm } from "@/components/email/ComposeForm";
import { Modal } from "@/components/ui/Modal";
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

  const [thread, setThread] = useState<ThreadWithRelations | null>(null);
  const [allLabels, setAllLabels] = useState<Label[]>([]);
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showReply, setShowReply] = useState(false);

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

  const handleSendReply = async (data: {
    from: string;
    to: string[];
    cc: string[];
    subject: string;
    body: string;
  }) => {
    if (!thread) return;

    const lastEmail = thread.emails[thread.emails.length - 1];

    try {
      await fetch("/api/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          subject: thread.subject?.startsWith("Re:")
            ? thread.subject
            : `Re: ${thread.subject}`,
          replyToThreadId: threadId,
          inReplyTo: lastEmail?.messageId,
          references: lastEmail?.referencesHeader || [],
        }),
      });
      setShowReply(false);
      fetchThread();
    } catch (error) {
      console.error("Failed to send reply:", error);
    }
  };

  const handleAIAssist = async (instruction: string): Promise<string> => {
    const res = await fetch("/api/ai/compose", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        threadId,
        instruction,
      }),
    });
    const data = await res.json();
    return data.draft || "";
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

  // Get reply-to address
  const lastInboundEmail = [...thread.emails]
    .reverse()
    .find((e) => e.direction === "inbound");
  const replyTo = lastInboundEmail
    ? [lastInboundEmail.fromAddress]
    : thread.participantAddresses?.filter(
        (a) => !mailboxes.some((m) => m.address === a)
      ) || [];

  return (
    <div className="h-full flex flex-col">
      {/* Back button */}
      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={() => router.push("/inbox")}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to inbox
        </button>
      </div>

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
              router.push("/inbox?trashed=true");
              router.refresh();
            } else {
              updateThread({ isTrashed: true });
              router.push("/inbox?trashed=true");
            }
          }}
          onAddLabel={addLabel}
          onRemoveLabel={removeLabel}
          onReply={() => setShowReply(true)}
        />
      </div>

      {/* Reply modal */}
      <Modal
        isOpen={showReply}
        onClose={() => setShowReply(false)}
        title="Reply"
        size="lg"
      >
        <ComposeForm
          mailboxes={mailboxes}
          defaultTo={replyTo}
          defaultSubject={
            thread.subject?.startsWith("Re:")
              ? thread.subject
              : `Re: ${thread.subject}`
          }
          replyToThreadId={threadId}
          onSend={handleSendReply}
          onAIAssist={handleAIAssist}
          onCancel={() => setShowReply(false)}
          isCompact
        />
      </Modal>
    </div>
  );
}
