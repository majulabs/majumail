"use client";

import { useState, useEffect } from "react";
import {
  X,
  Send,
  Sparkles,
  Loader2,
  Paperclip,
  ChevronDown,
  ChevronUp,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { AttachmentUpload } from "@/components/attachments/AttachmentUpload";
import { SmartReplies } from "@/components/ai/SmartReplies";
import { cn } from "@/lib/utils/cn";

interface UploadedFile {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
  attachmentId?: string;
}

interface Mailbox {
  id: string;
  address: string;
  displayName: string | null;
}

interface ComposeFormProps {
  isOpen: boolean;
  onClose: () => void;
  replyTo?: {
    threadId: string;
    subject: string;
    toAddress: string;
    toName?: string;
  };
  mailboxes?: Mailbox[];
  onSend?: (data: {
    to: string;
    subject: string;
    body: string;
    attachmentIds: string[];
  }) => Promise<void>;
}

export function ComposeForm({ isOpen, onClose, replyTo, mailboxes = [], onSend }: ComposeFormProps) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);
  const [showAttachments, setShowAttachments] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [showAiPrompt, setShowAiPrompt] = useState(false);

  // Initialize with reply data and default mailbox
  useEffect(() => {
    if (replyTo) {
      setTo(replyTo.toAddress);
      setSubject(
        replyTo.subject.startsWith("Re:") ? replyTo.subject : `Re: ${replyTo.subject}`
      );
    } else {
      setTo("");
      setSubject("");
    }
    setBody("");
    setAttachments([]);
    setShowAttachments(false);
    
    // Set default from address
    if (mailboxes.length > 0 && !from) {
      setFrom(mailboxes[0].address);
    }
  }, [replyTo, isOpen, mailboxes]);

  // Update from when mailboxes load
  useEffect(() => {
    if (mailboxes.length > 0 && !from) {
      setFrom(mailboxes[0].address);
    }
  }, [mailboxes, from]);

  const handleSend = async () => {
    if (!from || !to.trim() || !body.trim()) return;

    // Check if all attachments are uploaded
    const pendingAttachments = attachments.filter((a) => a.status !== "done");
    if (pendingAttachments.length > 0) {
      alert("Please wait for all attachments to finish uploading");
      return;
    }

    setIsSending(true);
    try {
      const attachmentIds = attachments
        .filter((a) => a.attachmentId)
        .map((a) => a.attachmentId!);

      if (onSend) {
        await onSend({ to, subject, body, attachmentIds });
      } else {
        // Default send behavior - match existing API format
        const res = await fetch("/api/emails/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            from: from,
            to: [to.trim()], // API expects array
            subject: subject || "(no subject)",
            body: body,
            replyToThreadId: replyTo?.threadId,
            attachmentIds,
          }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Failed to send email");
        }
      }

      onClose();
    } catch (error) {
      console.error("Send error:", error);
      alert(`Failed to send email: ${(error as Error).message}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;

    setIsGenerating(true);
    try {
      const res = await fetch("/api/ai/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instruction: aiPrompt,
          threadId: replyTo?.threadId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setBody(data.draft || "");
        if (data.suggestedSubject && !subject) {
          setSubject(data.suggestedSubject);
        }
        setShowAiPrompt(false);
        setAiPrompt("");
      }
    } catch (error) {
      console.error("AI generation error:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSmartReplySelect = (preview: string) => {
    setBody(preview);
  };

  if (!isOpen) return null;

  const hasAttachments = attachments.length > 0;
  const uploadedCount = attachments.filter((a) => a.status === "done").length;
  const selectedMailbox = mailboxes.find((m) => m.address === from);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white dark:bg-gray-900 rounded-t-xl sm:rounded-xl shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {replyTo ? "Reply" : "New Message"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* From Field (Mailbox Selector) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              From
            </label>
            {mailboxes.length > 1 ? (
              <div className="relative">
                <select
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                >
                  {mailboxes.map((mailbox) => (
                    <option key={mailbox.id} value={mailbox.address}>
                      {mailbox.displayName
                        ? `${mailbox.displayName} <${mailbox.address}>`
                        : mailbox.address}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            ) : mailboxes.length === 1 ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300">
                <Mail className="h-4 w-4 text-gray-400" />
                {selectedMailbox?.displayName
                  ? `${selectedMailbox.displayName} <${selectedMailbox.address}>`
                  : selectedMailbox?.address || from}
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm text-yellow-700 dark:text-yellow-300">
                <Mail className="h-4 w-4" />
                No mailboxes configured
              </div>
            )}
          </div>

          {/* To Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              To
            </label>
            <Input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
            />
          </div>

          {/* Subject Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Subject
            </label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
            />
          </div>

          {/* Smart Replies (for replies only) */}
          {replyTo && (
            <SmartReplies
              threadId={replyTo.threadId}
              onSelectReply={handleSmartReplySelect}
            />
          )}

          {/* AI Compose Section */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <button
              onClick={() => setShowAiPrompt(!showAiPrompt)}
              className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-purple-500" />
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  AI Compose
                </span>
              </div>
              {showAiPrompt ? (
                <ChevronUp className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              )}
            </button>

            {showAiPrompt && (
              <div className="p-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex gap-2">
                  <Input
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="Describe what you want to write..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleAiGenerate();
                      }
                    }}
                  />
                  <Button
                    onClick={handleAiGenerate}
                    isLoading={isGenerating}
                    disabled={!aiPrompt.trim()}
                  >
                    Generate
                  </Button>
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  e.g., "Write a polite follow-up about our proposal" or "Decline the meeting request"
                </p>
              </div>
            )}
          </div>

          {/* Body Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Message
            </label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message..."
              rows={10}
              className="min-h-[200px]"
            />
          </div>

          {/* Attachments Section */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <button
              onClick={() => setShowAttachments(!showAttachments)}
              className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center gap-2 text-sm">
                <Paperclip className="h-4 w-4 text-gray-500" />
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  Attachments
                </span>
                {hasAttachments && (
                  <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-xs rounded">
                    {uploadedCount}/{attachments.length}
                  </span>
                )}
              </div>
              {showAttachments ? (
                <ChevronUp className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              )}
            </button>

            {showAttachments && (
              <div className="p-3 border-t border-gray-200 dark:border-gray-700">
                <AttachmentUpload
                  onFilesChange={setAttachments}
                  maxFiles={10}
                  maxSizeMB={10}
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAttachments(true)}
              className={cn(
                "p-2 rounded-lg transition-colors",
                hasAttachments
                  ? "text-blue-600 bg-blue-50 dark:bg-blue-900/20"
                  : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              )}
              title="Add attachments"
            >
              <Paperclip className="h-5 w-5" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              isLoading={isSending}
              disabled={!from || !to.trim() || !body.trim()}
            >
              <Send className="h-4 w-4 mr-2" />
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}