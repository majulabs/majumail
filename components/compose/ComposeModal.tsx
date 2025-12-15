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
  Palette,
  Eye,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useCompose } from "@/components/providers/ComposeProvider";
import { EmailPreview } from "@/components/compose/EmailPreview";
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

export function ComposeModal() {
  const { isOpen, closeCompose, replyTo, threadId, defaultTo, defaultSubject } = useCompose();
  
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
  
  // Attachments
  const [attachments, setAttachments] = useState<AttachmentUpload[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const templateRef = useRef<HTMLDivElement>(null);

  // Fetch mailboxes when modal opens
  useEffect(() => {
    if (isOpen) {
      fetch("/api/mailboxes")
        .then((res) => res.json())
        .then((data) => {
          setMailboxes(data.mailboxes || []);
          if (data.mailboxes?.length > 0 && !from) {
            setFrom(data.mailboxes[0].address);
          }
        })
        .catch(console.error);
    }
  }, [isOpen, from]);

  // Set defaults when opening
  useEffect(() => {
    if (isOpen) {
      setTo(defaultTo || replyTo?.from || "");
      setSubject(defaultSubject || (replyTo ? `Re: ${replyTo.subject}` : ""));
      setBody("");
      setError(null);
      setAttachments([]);
      setShowAiPrompt(false);
      setAiPrompt("");
    }
  }, [isOpen, defaultTo, defaultSubject, replyTo]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Close template selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (templateRef.current && !templateRef.current.contains(e.target as Node)) {
        setShowTemplateSelector(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        if (showPreview) {
          setShowPreview(false);
        } else {
          closeCompose();
        }
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, showPreview, closeCompose]);

  // Handle Cmd/Ctrl + Enter to send
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && isOpen && !isSending) {
        e.preventDefault();
        handleSend();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSending, to, from, subject, body]);

  // Handle file attachment
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    for (const file of Array.from(files)) {
      const uploadId = crypto.randomUUID();
      
      // Add to list as uploading
      setAttachments(prev => [...prev, {
        id: uploadId,
        file,
        status: "uploading"
      }]);

      // Upload file
      try {
        const formData = new FormData();
        formData.append("file", file);
        
        const res = await fetch("/api/attachments/upload", {
          method: "POST",
          body: formData,
        });
        
        if (!res.ok) throw new Error("Upload failed");
        
        const data = await res.json();
        
        setAttachments(prev => prev.map(a => 
          a.id === uploadId 
            ? { ...a, status: "done" as const, attachmentId: data.attachmentId }
            : a
        ));
      } catch (err) {
        setAttachments(prev => prev.map(a => 
          a.id === uploadId 
            ? { ...a, status: "error" as const, error: "Upload failed" }
            : a
        ));
      }
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Remove attachment
  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  // Send email
  const handleSend = async () => {
    if (!to || !from) {
      setError("Please fill in the recipient");
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      // Get attachment IDs
      const attachmentIds = attachments
        .filter(a => a.status === "done" && a.attachmentId)
        .map(a => a.attachmentId!);

      const res = await fetch("/api/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to: [to.trim()],
          subject: subject || "(no subject)",
          body,
          templateType: emailTemplate,
          replyToThreadId: threadId,
          replyToMessageId: replyTo?.messageId,
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

  // AI Generate
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
              {replyTo ? "Reply" : "New Message"}
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

            {/* From */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                From
              </label>
              {mailboxes.length > 0 ? (
                <div className="relative">
                  <select
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="w-full px-3 py-2 pr-8 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
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
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm text-yellow-700 dark:text-yellow-300">
                  <Mail className="h-4 w-4" />
                  No mailboxes configured
                </div>
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
                  "border border-gray-300 dark:border-gray-600 rounded-lg",
                  "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100",
                  "hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
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
                  <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                )}
              </button>

              {/* Template Dropdown */}
              {showTemplateSelector && (
                <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
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
                        "hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors",
                        emailTemplate === option.value && "bg-blue-50 dark:bg-blue-900/20"
                      )}
                    >
                      <div
                        className={cn(
                          "mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0",
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
                <div className="p-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
                  <Textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="Describe what you want to write... e.g., 'Write a polite follow-up about our meeting'"
                    className="min-h-[80px]"
                  />
                  <Button
                    onClick={handleAIGenerate}
                    disabled={isGenerating || !aiPrompt.trim()}
                    size="sm"
                    className="w-full"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate Draft
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>

            {/* Message Body */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Message
              </label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your message..."
                className="min-h-[200px] resize-none"
              />
            </div>

            {/* Attachments */}
            {hasAttachments && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Attachments
                </label>
                <div className="space-y-1">
                  {attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className={cn(
                        "flex items-center justify-between px-3 py-2 rounded-lg text-sm",
                        attachment.status === "error"
                          ? "bg-red-50 dark:bg-red-900/20"
                          : "bg-gray-50 dark:bg-gray-800"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Paperclip className="h-4 w-4 text-gray-400 shrink-0" />
                        <span className="truncate text-gray-700 dark:text-gray-300">
                          {attachment.file.name}
                        </span>
                        {attachment.status === "uploading" && (
                          <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                        )}
                        {attachment.status === "error" && (
                          <span className="text-red-500 text-xs">Failed</span>
                        )}
                      </div>
                      <button
                        onClick={() => removeAttachment(attachment.id)}
                        className="p-1 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center justify-between gap-3">
              {/* Left actions */}
              <div className="flex items-center gap-2">
                {/* Attachment button */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  title="Add attachment"
                >
                  <Paperclip className="h-5 w-5" />
                </button>
              </div>

              {/* Right actions */}
              <div className="flex items-center gap-2">
                {/* Preview button */}
                {emailTemplate !== "none" && body.trim() && (
                  <Button
                    variant="outline"
                    onClick={() => setShowPreview(true)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                )}
                
                {/* Send button */}
                <Button
                  onClick={handleSend}
                  disabled={isSending || !to || uploadingCount > 0}
                >
                  {isSending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            {/* Keyboard shortcut hint */}
            <p className="text-xs text-gray-400 mt-2 text-center">
              Press ⌘+Enter to send
            </p>
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
    </>
  );
}