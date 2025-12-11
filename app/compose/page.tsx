"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ComposeForm } from "@/components/email/ComposeForm";
import type { Mailbox } from "@/lib/db/schema";

export default function ComposePage() {
  const router = useRouter();
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMailboxes = async () => {
      try {
        const res = await fetch("/api/mailboxes");
        const data = await res.json();
        setMailboxes(data.mailboxes || []);
      } catch (error) {
        console.error("Failed to fetch mailboxes:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMailboxes();
  }, []);

  const handleSend = async (data: {
    from: string;
    to: string[];
    cc: string[];
    subject: string;
    body: string;
  }) => {
    try {
      const res = await fetch("/api/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        const result = await res.json();
        router.push(`/inbox/${result.threadId}`);
      }
    } catch (error) {
      console.error("Failed to send email:", error);
    }
  };

  const handleAIAssist = async (instruction: string): Promise<string> => {
    const res = await fetch("/api/ai/compose", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instruction }),
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

  return (
    <div className="h-full bg-white dark:bg-gray-900">
      <ComposeForm
        mailboxes={mailboxes}
        onSend={handleSend}
        onAIAssist={handleAIAssist}
        onCancel={() => router.push("/inbox")}
      />
    </div>
  );
}
