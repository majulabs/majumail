"use client";

import { useEffect, useState } from "react";
import { ComposeForm } from "@/components/compose/ComposeForm";
import type { Mailbox } from "@/lib/db/schema";

interface ClientLayoutProps {
  children: React.ReactNode;
}

export function ClientLayout({ children }: ClientLayoutProps) {
  const [showCompose, setShowCompose] = useState(false);
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);

  useEffect(() => {
    async function fetchMailboxes() {
      try {
        const res = await fetch("/api/mailboxes");
        if (!res.ok) throw new Error("Failed to fetch mailboxes");
        const data = await res.json();
        setMailboxes(data.mailboxes || []);
      } catch {
        // Optionally handle error
      }
    }
    fetchMailboxes();
  }, []);

  return (
    <>
      {children}
      {/* Compose Modal - renders on top of everything */}
      <ComposeForm
        isOpen={showCompose}
        onClose={() => setShowCompose(false)}
        mailboxes={mailboxes}
      />
    </>
  );
}

// Export a function to open compose from anywhere
export const openCompose = () => {
  window.dispatchEvent(new CustomEvent('openCompose'));
};