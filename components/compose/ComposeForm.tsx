"use client";

import { useState, useEffect, useRef } from "react";
import {
  X,
  Send,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Paperclip,
  Trash2,
  Mail,
  FileText,
  Palette,
  Eye,
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { SmartReplies } from "@/components/ai/SmartReplies";
import { cn } from "@/lib/utils/cn";
import { EmailPreview } from "@/components/compose/EmailPreview";
import type { Mailbox } from "@/lib/db/schema";
import type { EmailTemplateType } from "@/lib/email/template";

interface AttachmentUpload {
  id: string;
  file: File;
  status: "uploading" | "done" | "error";
  attachmentId?: string;
  error?: string;
}

interface ComposeFormProps {
  isOpen: boolean;
  onClose: () => void;
  mailboxes: Mailbox[];
  replyTo?: {
    threadId: string;
    to: string;
    subject: string;
    inReplyTo?: string;
    references?: string[];
  };
  onSend?: (data: {
    to: string;
    subject: string;
    body: string;
    attachmentIds: string[];
  }) => Promise<void>;
}

// Template options with descriptions
const TEMPLATE_OPTIONS: { value: EmailTemplateType; label: string; description: string }[] = [
  {
    value: "branded",
    label: "Branded",
    description: "Professional template with RechnungsAPI branding, logo, and footer",
  },
  {
    value: "simple",
    label: "Simple",
    description: "Clean HTML formatting without heavy branding",
  },
  {
    value: "none",
    label: "Plain Text",
    description: "No HTML formatting, just plain text",
  },
];

export function ComposeForm({
  isOpen,
  onClose,
  mailboxes,
  replyTo,
  onSend,
}: ComposeFormProps) {
  const [from, setFrom] = useState(mailboxes[0]?.address || "");
  const [to, setTo] = useState(replyTo?.to || "");
  const [subject, setSubject] = useState(
    replyTo?.subject
      ? replyTo.subject.startsWith("Re:")
        ? replyTo.subject
        : `Re: ${replyTo.subject}`
      : ""
  );
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showAiPrompt, setShowAiPrompt] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentUpload[]>([]);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [emailTemplate, setEmailTemplate] = useState<EmailTemplateType>("branded");
  const [showPreview, setShowPreview] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const templateRef = useRef<HTMLDivElement>(null);

  // Close template dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (templateRef.current && !templateRef.current.contains(event.target as Node)) {
        setShowTemplateSelector(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset form when replyTo changes
  useEffect(() => {
    if (replyTo) {
      setTo(replyTo.to);
      setSubject(
        replyTo.subject.startsWith("Re:")
          ? replyTo.subject
          : `Re: ${replyTo.subject}`
      );
      // Use simple template for replies by default
      setEmailTemplate("simple");
    } else {
      setTo("");
      setSubject("");
      // Use branded template for new emails by default
      setEmailTemplate("branded");
    }
    setBody("");
    setAttachments([]);
  }, [replyTo]);

  // Set default mailbox
  useEffect(() => {
    if (mailboxes.length > 0 && !from) {
      setFrom(mailboxes[0].address);
    }
  }, [mailboxes, from]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      const uploadId = `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      // Add to state as uploading
      setAttachments((prev) => [
        ...prev,
        { id: uploadId, file, status: "uploading" },
      ]);

      try {
        // Upload the file
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/attachments/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          throw new Error("Upload failed");
        }

        const data = await res.json();

        // Update state with success
        setAttachments((prev) =>
          prev.map((a) =>
            a.id === uploadId
              ? { ...a, status: "done", attachmentId: data.attachmentId }
              : a
          )
        );
      } catch (error) {
        // Update state with error
        setAttachments((prev) =>
          prev.map((a) =>
            a.id === uploadId
              ? { ...a, status: "error", error: (error as Error).message }
              : a
          )
        );
      }
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveAttachment = (uploadId: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== uploadId));
  };

  const handleSend = async () => {
    if (!to.trim() || isSending) return;

    setIsSending(true);
    try {
      // Collect successful attachment IDs
      const attachmentIds = attachments
        .filter((a) => a.status === "done" && a.attachmentId)
        .map((a) => a.attachmentId!);

      if (onSend) {
        await onSend({ to, subject, body, attachmentIds });
      } else {
        // Default send behavior - include template type
        const res = await fetch("/api/emails/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            from: from,
            to: [to.trim()],
            subject: subject || "(no subject)",
            body: body,
            templateType: emailTemplate,
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
  const selectedTemplate = TEMPLATE_OPTIONS.find((t) => t.value === emailTemplate);

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
            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {/* From Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                From
              </label>
              {mailboxes.length > 0 ? (
                <select
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {mailboxes.map((mailbox) => (
                    <option key={mailbox.id} value={mailbox.address}>
                      {mailbox.displayName
                        ? `${mailbox.displayName} <${mailbox.address}>`
                        : mailbox.address}
                    </option>
                  ))}
                </select>
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

            {/* Template Selector */}
            <div className="relative" ref={templateRef}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email Template
              </label>
              <button
                type="button"
                onClick={() => setShowTemplateSelector(!showTemplateSelector)}
                className={cn(
                  "w-full flex items-center justify-between gap-2 px-3 py-2",
                  "border border-gray-300 dark:border-gray-700 rounded-lg",
                  "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100",
                  "hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                )}
              >
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">{selectedTemplate?.label}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    – {selectedTemplate?.description}
                  </span>
                </div>
                {showTemplateSelector ? (
                  <ChevronUp className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                )}
              </button>

              {/* Dropdown */}
              {showTemplateSelector && (
                <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
                  {TEMPLATE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setEmailTemplate(option.value);
                        setShowTemplateSelector(false);
                      }}
                      className={cn(
                        "w-full flex items-start gap-3 px-4 py-3 text-left",
                        "hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors",
                        emailTemplate === option.value && "bg-blue-50 dark:bg-blue-900/20"
                      )}
                    >
                      <div
                        className={cn(
                          "mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center",
                          emailTemplate === option.value
                            ? "border-blue-500 bg-blue-500"
                            : "border-gray-300 dark:border-gray-600"
                        )}
                      >
                        {emailTemplate === option.value && (
                          <div className="h-1.5 w-1.5 rounded-full bg-white" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {option.label}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {option.description}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
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
                <div className="p-3 space-y-2 bg-purple-50 dark:bg-purple-900/20">
                  <div className="flex gap-2">
                    <Input
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="Describe what you want to write..."
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleAiGenerate();
                        }
                      }}
                    />
                    <Button
                      onClick={handleAiGenerate}
                      disabled={!aiPrompt.trim() || isGenerating}
                      isLoading={isGenerating}
                    >
                      Generate
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Body */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Message
              </label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your message..."
                rows={10}
                className="resize-none"
              />
            </div>

            {/* Attachments */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Attachments
                </label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                >
                  <Paperclip className="h-4 w-4" />
                  Add file
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />

              {hasAttachments && (
                <div className="space-y-2">
                  {attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg border",
                        attachment.status === "error"
                          ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20"
                          : "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800"
                      )}
                    >
                      <FileText className="h-4 w-4 text-gray-400" />
                      <span className="flex-1 text-sm truncate text-gray-700 dark:text-gray-300">
                        {attachment.file.name}
                      </span>
                      {attachment.status === "uploading" && (
                        <span className="text-xs text-gray-500">Uploading...</span>
                      )}
                      {attachment.status === "error" && (
                        <span className="text-xs text-red-600">{attachment.error}</span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(attachment.id)}
                        className="p-1 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            {emailTemplate === "branded" && (
              <span className="flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded">
                <Palette className="h-3 w-3" />
                Branded
              </span>
            )}
            {hasAttachments && (
              <span className="flex items-center gap-1">
                <Paperclip className="h-3 w-3" />
                {uploadedCount}/{attachments.length} files
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {emailTemplate !== "none" && body.trim() && (
              <Button
                variant="outline"
                onClick={() => setShowPreview(true)}
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
            )}
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              isLoading={isSending}
              disabled={!from || !to.trim()}
            >
              <Send className="h-4 w-4 mr-2" />
              Send
            </Button>
          </div>
        </div>
      </div>

      {/* Email Preview Modal */}
      <EmailPreview
        body={body}
        templateType={emailTemplate}
        senderName={selectedMailbox?.displayName || undefined}
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
      />
    </div>
  );
}
