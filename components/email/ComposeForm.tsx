"use client";

import { useState, useEffect } from "react";
import { Send, Sparkles, ChevronDown, X, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { cn } from "@/lib/utils/cn";
import type { Mailbox, Contact } from "@/lib/db/schema";

interface ComposeFormProps {
  mailboxes: Mailbox[];
  defaultFrom?: string;
  defaultTo?: string[];
  defaultSubject?: string;
  defaultBody?: string;
  replyToThreadId?: string;
  inReplyTo?: string;
  references?: string[];
  onSend: (data: {
    from: string;
    to: string[];
    cc: string[];
    subject: string;
    body: string;
    replyToThreadId?: string;
    inReplyTo?: string;
    references?: string[];
  }) => Promise<void>;
  // Updated to accept optional existingBody parameter for text modification
  onAIAssist?: (instruction: string, existingBody?: string) => Promise<string>;
  onCancel?: () => void;
  isCompact?: boolean;
}

export function ComposeForm({
  mailboxes,
  defaultFrom,
  defaultTo = [],
  defaultSubject = "",
  defaultBody = "",
  replyToThreadId,
  inReplyTo,
  references,
  onSend,
  onAIAssist,
  onCancel,
  isCompact = false,
}: ComposeFormProps) {
  const [from, setFrom] = useState(defaultFrom || mailboxes[0]?.address || "");
  const [to, setTo] = useState<string[]>(defaultTo);
  const [toInput, setToInput] = useState("");
  const [cc, setCc] = useState<string[]>([]);
  const [ccInput, setCcInput] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [isSending, setIsSending] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiInstruction, setAIInstruction] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Check if there's existing text in the body
  const hasExistingBody = body.trim().length > 0;

  // Load contacts for autocomplete
  useEffect(() => {
    const loadContacts = async () => {
      try {
        const res = await fetch("/api/contacts?limit=50");
        const data = await res.json();
        setContacts(data.contacts || []);
      } catch (error) {
        console.error("Failed to load contacts:", error);
      }
    };
    loadContacts();
  }, []);

  const handleSend = async () => {
    if (!from || to.length === 0 || !subject.trim()) {
      return;
    }

    setIsSending(true);
    try {
      await onSend({
        from,
        to,
        cc,
        subject,
        body,
        replyToThreadId,
        inReplyTo,
        references,
      });
    } finally {
      setIsSending(false);
    }
  };

  // Updated to pass existing body for modification
  const handleAIGenerate = async () => {
    if (!aiInstruction.trim() || !onAIAssist) return;

    setIsAILoading(true);
    try {
      // Pass existing body if there is content - AI will modify it
      const draft = await onAIAssist(
        aiInstruction,
        hasExistingBody ? body : undefined
      );
      setBody(draft);
      setShowAIPanel(false);
      setAIInstruction("");
    } finally {
      setIsAILoading(false);
    }
  };

  const addRecipient = (email: string, type: "to" | "cc") => {
    const trimmed = email.trim();
    if (!trimmed) return;

    if (type === "to" && !to.includes(trimmed)) {
      setTo([...to, trimmed]);
      setToInput("");
    } else if (type === "cc" && !cc.includes(trimmed)) {
      setCc([...cc, trimmed]);
      setCcInput("");
    }
    setShowSuggestions(false);
  };

  const removeRecipient = (email: string, type: "to" | "cc") => {
    if (type === "to") {
      setTo(to.filter((e) => e !== email));
    } else {
      setCc(cc.filter((e) => e !== email));
    }
  };

  const filteredContacts = contacts.filter(
    (c) =>
      c.email.toLowerCase().includes(toInput.toLowerCase()) &&
      !to.includes(c.email)
  );

  return (
    <div className={cn("flex flex-col", !isCompact && "h-full")}>
      {/* Header */}
      {!isCompact && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {replyToThreadId ? "Reply" : "New Message"}
          </h2>
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      )}

      {/* Form */}
      <div className={cn("flex-1 overflow-y-auto", !isCompact && "p-4")}>
        <div className="space-y-4">
          {/* From */}
          <div className="flex items-center gap-3">
            <label className="w-16 text-sm text-gray-600 dark:text-gray-400">
              From
            </label>
            <select
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            >
              {mailboxes.map((m) => (
                <option key={m.id} value={m.address}>
                  {m.displayName ? `${m.displayName} <${m.address}>` : m.address}
                </option>
              ))}
            </select>
          </div>

          {/* To */}
          <div className="flex items-start gap-3">
            <label className="w-16 text-sm text-gray-600 dark:text-gray-400 mt-2">
              To
            </label>
            <div className="flex-1">
              <div className="flex flex-wrap gap-1 p-2 min-h-[42px] rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900">
                {to.map((email) => (
                  <span
                    key={email}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 rounded text-sm"
                  >
                    {email}
                    <button
                      type="button"
                      onClick={() => removeRecipient(email, "to")}
                      className="hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <div className="relative flex-1 min-w-[150px]">
                  <input
                    value={toInput}
                    onChange={(e) => {
                      setToInput(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        addRecipient(toInput, "to");
                      }
                    }}
                    onBlur={() => {
                      setTimeout(() => setShowSuggestions(false), 200);
                    }}
                    placeholder={to.length === 0 ? "Add recipients (press Enter)..." : ""}
                    className="w-full bg-transparent outline-none text-gray-900 dark:text-gray-100"
                  />
                  {showSuggestions && filteredContacts.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                      {filteredContacts.map((contact) => (
                        <button
                          key={contact.id}
                          type="button"
                          onClick={() => addRecipient(contact.email, "to")}
                          className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm"
                        >
                          <div className="text-gray-900 dark:text-gray-100">
                            {contact.name || contact.email}
                          </div>
                          {contact.name && (
                            <div className="text-gray-500 text-xs">
                              {contact.email}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCc(!showCc)}
                className="text-xs text-blue-600 hover:text-blue-700 mt-1"
              >
                {showCc ? "Hide CC" : "Add CC"}
              </button>
            </div>
          </div>

          {/* CC */}
          {showCc && (
            <div className="flex items-start gap-3">
              <label className="w-16 text-sm text-gray-600 dark:text-gray-400 mt-2">
                CC
              </label>
              <div className="flex-1">
                <div className="flex flex-wrap gap-1 p-2 min-h-[42px] rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900">
                  {cc.map((email) => (
                    <span
                      key={email}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded text-sm"
                    >
                      {email}
                      <button
                        type="button"
                        onClick={() => removeRecipient(email, "cc")}
                        className="hover:text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    value={ccInput}
                    onChange={(e) => setCcInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        addRecipient(ccInput, "cc");
                      }
                    }}
                    placeholder=""
                    className="flex-1 min-w-[150px] bg-transparent outline-none text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Subject */}
          {!replyToThreadId && (
            <div className="flex items-center gap-3">
              <label className="w-16 text-sm text-gray-600 dark:text-gray-400">
                Subject
              </label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject"
                className="flex-1"
              />
            </div>
          )}

          {/* Body */}
          <div>
            <div className="flex items-center justify-between mb-2">
              {onAIAssist && (
                <button
                  type="button"
                  onClick={() => setShowAIPanel(!showAIPanel)}
                  className={cn(
                    "inline-flex items-center gap-1.5 text-sm",
                    hasExistingBody
                      ? "text-violet-600 hover:text-violet-700"
                      : "text-purple-600 hover:text-purple-700"
                  )}
                >
                  {hasExistingBody ? (
                    <Wand2 className="h-4 w-4" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {hasExistingBody ? "Modify with AI" : "AI Assist"}
                </button>
              )}
            </div>

            {/* AI Panel */}
            {showAIPanel && (
              <div className="mb-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                {hasExistingBody ? (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <Wand2 className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                      <p className="text-sm font-medium text-violet-700 dark:text-violet-300">
                        Modify existing text
                      </p>
                    </div>
                    <p className="text-xs text-violet-600 dark:text-violet-400 mb-3">
                      Describe how you want to change the current text (e.g., "make it more formal", "shorten it", "add a call to action")
                    </p>
                    {/* Quick suggestions for modification */}
                    <div className="flex gap-2 mb-3 flex-wrap">
                      {[
                        "Make it shorter",
                        "More formal",
                        "More friendly",
                        "Add call to action",
                        "Fix grammar",
                        "Translate to English",
                        "Translate to German",
                      ].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setAIInstruction(preset)}
                          className="px-2 py-1 text-xs bg-white dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-full text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex gap-2 mb-3 flex-wrap">
                      {["Reply positively", "Politely decline", "Request more info"].map(
                        (preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setAIInstruction(preset)}
                            className="px-2 py-1 text-xs bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-700 rounded hover:bg-purple-100 dark:hover:bg-purple-900"
                          >
                            {preset}
                          </button>
                        )
                      )}
                    </div>
                  </>
                )}
                <div className="flex gap-2">
                  <Input
                    value={aiInstruction}
                    onChange={(e) => setAIInstruction(e.target.value)}
                    placeholder={
                      hasExistingBody
                        ? "How should I modify the text?"
                        : "Describe what you want to write..."
                    }
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleAIGenerate();
                      }
                    }}
                  />
                  <Button
                    onClick={handleAIGenerate}
                    isLoading={isAILoading}
                    disabled={!aiInstruction.trim()}
                  >
                    {hasExistingBody ? "Modify" : "Generate"}
                  </Button>
                </div>
              </div>
            )}

            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message..."
              rows={isCompact ? 4 : 12}
              className="resize-none"
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        className={cn(
          "flex items-center justify-between gap-3",
          !isCompact && "px-4 py-3 border-t border-gray-200 dark:border-gray-700"
        )}
      >
        <div className="text-xs text-gray-500">
          {!from && <span className="text-amber-600">No sender mailbox available</span>}
          {from && to.length === 0 && <span className="text-amber-600">Add at least one recipient (press Enter after typing)</span>}
          {from && to.length > 0 && !replyToThreadId && !subject.trim() && <span className="text-amber-600">Enter a subject</span>}
          {from && to.length > 0 && (replyToThreadId || subject.trim()) && (
            <span className="text-green-600">Ready to send to {to.length} recipient(s)</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onCancel && (
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button
            onClick={handleSend}
            isLoading={isSending}
            disabled={!from || to.length === 0 || (!replyToThreadId && !subject.trim())}
          >
            <Send className="h-4 w-4 mr-2" />
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}