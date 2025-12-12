"use client";

import { useState, useEffect } from "react";
import { 
  ChevronDown, 
  ChevronUp, 
  Loader2, 
  FileText, 
  CheckSquare,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface ThreadSummaryData {
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  sentiment: "positive" | "negative" | "neutral";
}

interface ThreadSummaryProps {
  threadId: string;
  emailCount: number;
  className?: string;
}

const SENTIMENT_CONFIG = {
  positive: {
    icon: TrendingUp,
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-900/20",
    label: "Positive",
  },
  negative: {
    icon: TrendingDown,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-900/20",
    label: "Negative",
  },
  neutral: {
    icon: Minus,
    color: "text-gray-600 dark:text-gray-400",
    bg: "bg-gray-50 dark:bg-gray-800",
    label: "Neutral",
  },
};

export function ThreadSummary({ threadId, emailCount, className }: ThreadSummaryProps) {
  const [summary, setSummary] = useState<ThreadSummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Only fetch for threads with 2+ emails
  const shouldFetch = emailCount >= 2;

  useEffect(() => {
    if (!threadId || hasLoaded || !shouldFetch) return;

    const fetchSummary = async () => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/ai/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ threadId }),
        });

        if (res.ok) {
          const data = await res.json();
          setSummary(data.summary);
        }
      } catch (error) {
        console.error("Failed to fetch thread summary:", error);
      } finally {
        setIsLoading(false);
        setHasLoaded(true);
      }
    };

    fetchSummary();
  }, [threadId, hasLoaded, shouldFetch]);

  if (!shouldFetch) {
    return null;
  }

  if (isLoading) {
    return (
      <div className={cn("p-4 bg-gray-50 dark:bg-gray-800 rounded-lg", className)}>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Generating summary...</span>
        </div>
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  const sentimentConfig = SENTIMENT_CONFIG[summary.sentiment] || SENTIMENT_CONFIG.neutral;
  const SentimentIcon = sentimentConfig.icon;

  return (
    <div className={cn("bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden", className)}>
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <FileText className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Thread Summary
          </span>
          <span className={cn(
            "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs",
            sentimentConfig.bg,
            sentimentConfig.color
          )}>
            <SentimentIcon className="h-3 w-3" />
            {sentimentConfig.label}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Summary */}
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {summary.summary}
            </p>
          </div>

          {/* Key Points */}
          {summary.keyPoints.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Key Points
              </h4>
              <ul className="space-y-1">
                {summary.keyPoints.map((point, index) => (
                  <li
                    key={index}
                    className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2"
                  >
                    <span className="text-gray-300 dark:text-gray-600">•</span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Items */}
          {summary.actionItems.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                <CheckSquare className="h-3 w-3" />
                Action Items
              </h4>
              <ul className="space-y-1">
                {summary.actionItems.map((item, index) => (
                  <li
                    key={index}
                    className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2"
                  >
                    <span className="w-4 h-4 rounded border border-gray-300 dark:border-gray-600 flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
