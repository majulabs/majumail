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
  Eye,
  Loader2,
  Wand2,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useCompose } from "@/components/providers/ComposeProvider";
import { useRole } from "@/components/providers/RoleProvider";
import { EmailPreview } from "@/components/compose/EmailPreview";
import { SmartReplies } from "@/components/ai/SmartReplies";
import type { EmailTemplateType } from "@/lib/email/template";

interface Mailbox {
  id: string;
  address: string;
  displayName: string | null;
}

interface AttachmentUpload {
  id: string;
  file: File;
  status: "uploading" | "done" | "error";
  attachmentId?: string;
  error?: string;
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

// Format date for display
function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ComposeModal() {
  const { isOpen, closeCompose, replyTo, threadId, defaultTo, defaultSubject, previousEmails } = useCompose();
  const { activeRole } = useRole();
  
  // Form state
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [emailTemplate, setEmailTemplate] = useState<EmailTemplateType>("branded");
  
  // UI state
  const [isSending, setIsSending] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [showAiPrompt, setShowAiPrompt] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [showPreviousEmails, setShowPreviousEmails] = useState(false);
  
  // Attachments
  const [attachments, setAttachments] = useState<AttachmentUpload[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const templateRef = useRef<HTMLDivElement>(null);

  // Check if there's existing text in the body
  const hasExistingBody = body.trim().length > 0;
  
  // Check if this is a reply
  const isReply = !!(replyTo || threadId);

  // Fetch mailboxes when modal opens
  useEffect(() => {
    if (isOpen) {
      fetch("/api/mailboxes")
        .then((res) => res.json())
        .then((data) => {
          setMailboxes(data.mailboxes || []);
          // Set default from address based on active role
          if (data.mailboxes?.length > 0) {
            // Find mailbox matching active role's mailbox address
            const roleMailbox = data.mailboxes.find(
              (m: Mailbox) => m.address.toLowerCase() === activeRole.mailboxAddress.toLowerCase()
            );
            setFrom(roleMailbox?.address || data.mailboxes[0].address);
          }
        })
        .catch(console.error);
    }
  }, [isOpen, activeRole.mailboxAddress]);

  // Set defaults when opening
  useEffect(() => {
    if (isOpen) {
      setTo(defaultTo || replyTo?.from || "");
      setSubject(defaultSubject || (replyTo ? `Re: ${replyTo.subject}` : ""));
      setBody("");
      setError(null);
      setShowAiPrompt(false);
      setAiPrompt("");
      setShowPreview(false);
      setShowPreviousEmails(false);
      setAttachments([]);
      // Use simple template for replies
      setEmailTemplate(replyTo ? "simple" : "branded");
    }
  }, [isOpen, defaultTo, defaultSubject, replyTo]);

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

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      const uploadId = `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      setAttachments((prev) => [
        ...prev,
        { id: uploadId, file, status: "uploading" },
      ]);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/attachments", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error("Upload failed");

        const data = await res.json();

        setAttachments((prev) =>
          prev.map((a) =>
            a.id === uploadId
              ? { ...a, status: "done", attachmentId: data.attachment.id }
              : a
          )
        );
      } catch (err) {
        setAttachments((prev) =>
          prev.map((a) =>
            a.id === uploadId
              ? { ...a, status: "error", error: "Failed to upload" }
              : a
          )
        );
      }
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Remove attachment
  const removeAttachment = (uploadId: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== uploadId));
  };

  // Send email
  const handleSend = async () => {
    if (!from || !to || !subject) {
      setError("Please fill in all required fields");
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      const attachmentIds = attachments
        .filter((a) => a.status === "done" && a.attachmentId)
        .map((a) => a.attachmentId);

      const res = await fetch("/api/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to: [to],
          subject,
          body,
          templateType: emailTemplate,
          replyToThreadId: threadId,
          inReplyTo: replyTo?.messageId,
          references: replyTo?.references,
          attachmentIds,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send email");
      }

      closeCompose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setIsSending(false);
    }
  };

  // AI Generate - now handles both creation and modification
  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) return;

    setIsGenerating(true);
    try {
      const res = await fetch("/api/ai/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instruction: aiPrompt,
          threadId,
          senderName: activeRole.name,
          // Pass existing body if there is content - AI will modify it
          existingBody: hasExistingBody ? body : undefined,
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

  if (!isOpen) return null;

  const selectedTemplate = TEMPLATE_OPTIONS.find(t => t.value === emailTemplate);
  const selectedMailbox = mailboxes.find(m => m.address === from);
  const hasAttachments = attachments.length > 0;
  const uploadingCount = attachments.filter(a => a.status === "uploading").length;
  const hasPreviousEmails = previousEmails.length > 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={closeCompose}
      />

      {/* Modal - CENTERED */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="relative w-full max-w-2xl max-h-[90vh] bg-white dark:bg-gray-900 rounded-xl shadow-2xl flex flex-col pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {isReply ? "Reply" : "New Message"}
            </h2>
            <button
              onClick={closeCompose}
              className="p-2 -mr-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form - Scrollable */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Error */}
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg">
                {error}
              </div>
            )}

            {/* Previous Emails (for replies) */}
            {isReply && hasPreviousEmails && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowPreviousEmails(!showPreviousEmails)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <MessageSquare className="h-4 w-4" />
                    <span>
                      {previousEmails.length} previous {previousEmails.length === 1 ? "message" : "messages"}
                    </span>
                  </div>
                  {showPreviousEmails ? (
                    <ChevronUp className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  )}
                </button>
                
                {showPreviousEmails && (
                  <div className="max-h-64 overflow-y-auto divide-y divide-gray-200 dark:divide-gray-700">
                    {previousEmails.map((email) => (
                      <div key={email.id} className="p-4 bg-white dark:bg-gray-900">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                              {email.fromName || email.fromAddress}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {email.fromAddress}
                            </p>
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                            {formatDate(email.sentAt)}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap line-clamp-4">
                          {email.bodyText || "(No content)"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* From */}
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
                <Input value={from} onChange={(e) => setFrom(e.target.value)} />
              )}
            </div>

            {/* To */}
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

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Subject
              </label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter subject..."
              />
            </div>

            {/* Template Selector */}
            <div ref={templateRef} className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email Template
              </label>
              <button
                type="button"
                onClick={() => setShowTemplateSelector(!showTemplateSelector)}
                className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <span>{selectedTemplate?.label || "Select template"}</span>
                {showTemplateSelector ? (
                  <ChevronUp className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                )}
              </button>

              {showTemplateSelector && (
                <div className="absolute top-full left-0 right-0 mt-1 z-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
                  {TEMPLATE_OPTIONS.map((template) => (
                    <button
                      key={template.value}
                      type="button"
                      onClick={() => {
                        setEmailTemplate(template.value);
                        setShowTemplateSelector(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-3 text-left transition-colors",
                        emailTemplate === template.value
                          ? "bg-blue-50 dark:bg-blue-900/20"
                          : "hover:bg-gray-50 dark:hover:bg-gray-700"
                      )}
                    >
                      <div className="flex-1">
                        <p className={cn(
                          "font-medium",
                          emailTemplate === template.value
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-gray-900 dark:text-gray-100"
                        )}>
                          {template.label}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {template.description}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Smart Replies (for replies only) */}
            {isReply && threadId && (
              <SmartReplies
                threadId={threadId}
                onSelectReply={setBody}
              />
            )}

            {/* Body Field */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Message
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPreview(!showPreview)}
                    className={cn(
                      "flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors",
                      showPreview
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                        : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                    )}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAiPrompt(!showAiPrompt)}
                    className={cn(
                      "flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors",
                      showAiPrompt
                        ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                        : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                    )}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {hasExistingBody ? "AI Edit" : "AI Write"}
                  </button>
                </div>
              </div>

              {/* AI Prompt Input */}
              {showAiPrompt && (
                <div className="mb-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Wand2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                      {hasExistingBody ? "How should I modify the text?" : "What should I write?"}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder={hasExistingBody 
                        ? "e.g., Make it more formal, Add a call to action, Translate to German..." 
                        : "e.g., Write a follow-up email about our meeting..."}
                      className="flex-1 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleAIGenerate();
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={handleAIGenerate}
                      disabled={isGenerating || !aiPrompt.trim()}
                      isLoading={isGenerating}
                    >
                      {hasExistingBody ? "Apply" : "Generate"}
                    </Button>
                  </div>
                  {hasExistingBody && (
                    <p className="mt-2 text-xs text-purple-600 dark:text-purple-400">
                      AI will modify your existing text based on the instruction
                    </p>
                  )}
                </div>
              )}

              {showPreview ? (
                <EmailPreview
                  body={body}
                  templateType={emailTemplate}
                  senderName={selectedMailbox?.displayName || activeRole.name}
                  isOpen={showPreview}
                  onClose={() => setShowPreview(false)}
                />
              ) : (
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write your message..."
                  rows={10}
                  className="resize-none"
                />
              )}
            </div>

            {/* Attachments */}
            {hasAttachments && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Attachments
                </label>
                <div className="flex flex-wrap gap-2">
                  {attachments.map((att) => (
                    <div
                      key={att.id}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
                        att.status === "uploading" && "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300",
                        att.status === "done" && "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300",
                        att.status === "error" && "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"
                      )}
                    >
                      <Paperclip className="h-4 w-4 shrink-0" />
                      <span className="truncate max-w-[150px]">{att.file.name}</span>
                      {att.status === "uploading" && (
                        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                      )}
                      <button
                        type="button"
                        onClick={() => removeAttachment(att.id)}
                        className="p-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 shrink-0">
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                id="compose-attachments"
              />
              <label
                htmlFor="compose-attachments"
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg cursor-pointer transition-colors"
              >
                <Paperclip className="h-5 w-5" />
              </label>
              <button
                type="button"
                onClick={() => {
                  setBody("");
                  setSubject("");
                  setTo("");
                  setAttachments([]);
                }}
                className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                title="Discard draft"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>

            <Button
              onClick={handleSend}
              disabled={isSending || !from || !to || uploadingCount > 0}
              isLoading={isSending}
            >
              <Send className="h-4 w-4 mr-2" />
              Send
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}