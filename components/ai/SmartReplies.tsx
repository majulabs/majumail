"use client";

import { useState, useEffect } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface SmartReply {
  id: string;
  text: string;
  type: "positive" | "negative" | "neutral" | "question";
  preview: string;
}

interface SmartRepliesProps {
  threadId: string;
  onSelectReply: (preview: string) => void;
  className?: string;
}

const TYPE_COLORS: Record<string, string> = {
  positive: "bg-green-50 border-green-200 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300",
  negative: "bg-red-50 border-red-200 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300",
  neutral: "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300",
  question: "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300",
};

export function SmartReplies({ threadId, onSelectReply, className }: SmartRepliesProps) {
  const [replies, setReplies] = useState<SmartReply[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (!threadId || hasLoaded) return;

    const fetchReplies = async () => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/ai/smart-replies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ threadId }),
        });

        if (res.ok) {
          const data = await res.json();
          setReplies(data.replies || []);
        }
      } catch (error) {
        console.error("Failed to fetch smart replies:", error);
      } finally {
        setIsLoading(false);
        setHasLoaded(true);
      }
    };

    fetchReplies();
  }, [threadId, hasLoaded]);

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2 text-sm text-gray-500", className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Generating suggestions...</span>
      </div>
    );
  }

  if (replies.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <Sparkles className="h-3.5 w-3.5" />
        <span>Smart Replies</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {replies.map((reply) => (
          <button
            key={reply.id}
            onClick={() => onSelectReply(reply.preview)}
            className={cn(
              "px-3 py-1.5 text-sm font-medium rounded-full border transition-colors",
              TYPE_COLORS[reply.type] || TYPE_COLORS.neutral
            )}
            title={reply.preview}
          >
            {reply.text}
          </button>
        ))}
      </div>
    </div>
  );
}
