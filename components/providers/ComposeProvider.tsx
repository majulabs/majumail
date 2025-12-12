"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { useSession } from "next-auth/react";
import { ComposeForm } from "@/components/compose/ComposeForm";

interface Mailbox {
  id: string;
  address: string;
  displayName: string | null;
}

interface ReplyToData {
  threadId: string;
  subject: string;
  toAddress: string;
  toName?: string;
}

interface ComposeContextType {
  openCompose: () => void;
  openReply: (data: ReplyToData) => void;
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
  const { status } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<ReplyToData | undefined>(undefined);
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);

  // Fetch mailboxes only when authenticated
  useEffect(() => {
    // Don't fetch if not authenticated
    if (status !== "authenticated") {
      return;
    }

    const fetchMailboxes = async () => {
      try {
        const res = await fetch("/api/mailboxes");
        if (res.ok) {
          const data = await res.json();
          setMailboxes(data.mailboxes || []);
        }
      } catch (error) {
        console.error("Failed to fetch mailboxes:", error);
      }
    };
    fetchMailboxes();
  }, [status]);

  const openCompose = useCallback(() => {
    setReplyTo(undefined);
    setIsOpen(true);
  }, []);

  const openReply = useCallback((data: ReplyToData) => {
    setReplyTo(data);
    setIsOpen(true);
  }, []);

  const closeCompose = useCallback(() => {
    setIsOpen(false);
    setReplyTo(undefined);
  }, []);

  return (
    <ComposeContext.Provider value={{ openCompose, openReply, closeCompose }}>
      {children}
      {/* Only render ComposeForm when authenticated */}
      {status === "authenticated" && (
        <ComposeForm
          isOpen={isOpen}
          onClose={closeCompose}
          replyTo={replyTo ? {
            threadId: replyTo.threadId,
            to: replyTo.toAddress, // map to expected prop
            subject: replyTo.subject,
            inReplyTo: undefined,
            references: undefined,
          } : undefined}
          mailboxes={mailboxes.map((m) => ({
            ...m,
            isShared: null,
            createdAt: null,
          }))}
        />
      )}
    </ComposeContext.Provider>
  );
}