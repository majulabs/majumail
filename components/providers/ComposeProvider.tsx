"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { ComposeModal } from "@/components/compose/ComposeModal";
import type { Email } from "@/lib/db/schema";

interface ReplyTo {
  from: string;
  subject: string;
  messageId?: string;
  references?: string[];
}

interface ComposeContextType {
  isOpen: boolean;
  replyTo: ReplyTo | null;
  threadId: string | null;
  defaultTo: string;
  defaultSubject: string;
  previousEmails: Email[];
  openCompose: (options?: {
    replyTo?: ReplyTo;
    threadId?: string;
    to?: string;
    subject?: string;
    previousEmails?: Email[];
  }) => void;
  closeCompose: () => void;
}

const ComposeContext = createContext<ComposeContextType | null>(null);

export function useCompose() {
  const context = useContext(ComposeContext);
  if (!context) {
    throw new Error("useCompose must be used within a ComposeProvider");
  }
  return context;
}

interface ComposeProviderProps {
  children: ReactNode;
}

export function ComposeProvider({ children }: ComposeProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<ReplyTo | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [defaultTo, setDefaultTo] = useState("");
  const [defaultSubject, setDefaultSubject] = useState("");
  const [previousEmails, setPreviousEmails] = useState<Email[]>([]);

  const openCompose = useCallback(
    (options?: {
      replyTo?: ReplyTo;
      threadId?: string;
      to?: string;
      subject?: string;
      previousEmails?: Email[];
    }) => {
      setReplyTo(options?.replyTo || null);
      setThreadId(options?.threadId || null);
      setDefaultTo(options?.to || "");
      setDefaultSubject(options?.subject || "");
      setPreviousEmails(options?.previousEmails || []);
      setIsOpen(true);
    },
    []
  );

  const closeCompose = useCallback(() => {
    setIsOpen(false);
    // Delay clearing state to allow exit animation
    setTimeout(() => {
      setReplyTo(null);
      setThreadId(null);
      setDefaultTo("");
      setDefaultSubject("");
      setPreviousEmails([]);
    }, 200);
  }, []);

  return (
    <ComposeContext.Provider
      value={{
        isOpen,
        replyTo,
        threadId,
        defaultTo,
        defaultSubject,
        previousEmails,
        openCompose,
        closeCompose,
      }}
    >
      {children}
      {/* ComposeModal is rendered here - always available globally */}
      <ComposeModal />
    </ComposeContext.Provider>
  );
}