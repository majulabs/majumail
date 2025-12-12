"use client";

import { useState, useEffect } from "react";
import { 
  Check, 
  X, 
  Loader2,
  Pencil,
  AlertCircle,
  Inbox,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { cn } from "@/lib/utils/cn";
import type { AIKnowledgePending } from "@/lib/db/schema";

const CATEGORY_LABELS: Record<string, string> = {
  company: "Company Information",
  products: "Products & Services",
  tone: "Communication Style",
  faq: "FAQ & Templates",
  procedures: "Procedures",
  custom: "Custom Knowledge",
  contact: "Contact Information",
};

export default function PendingKnowledgePage() {
  const [pending, setPending] = useState<AIKnowledgePending[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState("");

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = async () => {
    try {
      const res = await fetch("/api/knowledge/pending");
      const data = await res.json();
      setPending(data.pending || []);
    } catch (error) {
      console.error("Failed to fetch pending:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (id: string, action: "approve" | "reject") => {
    setProcessingId(id);
    try {
      const res = await fetch("/api/knowledge/pending", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          action,
          editedContent: editingId === id ? editedContent : undefined,
        }),
      });

      if (res.ok) {
        setPending((prev) => prev.filter((p) => p.id !== id));
        setEditingId(null);
        setEditedContent("");
      }
    } catch (error) {
      console.error("Failed to process:", error);
    } finally {
      setProcessingId(null);
    }
  };

  const startEditing = (item: AIKnowledgePending) => {
    setEditingId(item.id);
    setEditedContent(item.content);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditedContent("");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Pending Review
        </h2>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          Review and approve AI-extracted knowledge before it's added to your knowledge base.
        </p>
      </div>

      {pending.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-12">
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <Inbox className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No pending items
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              All AI-extracted knowledge has been reviewed. New items will appear here
              when the AI extracts information from your emails.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {pending.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden"
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                      {CATEGORY_LABELS[item.category] || item.category}
                    </span>
                    <h3 className="mt-2 font-medium text-gray-900 dark:text-gray-100">
                      {item.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "px-2 py-1 rounded text-xs font-medium",
                        item.confidence >= 80
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                          : item.confidence >= 60
                          ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                      )}
                    >
                      {item.confidence}% confidence
                    </div>
                  </div>
                </div>

                {editingId === item.id ? (
                  <div className="space-y-3">
                    <Textarea
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      rows={4}
                      className="w-full"
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={cancelEditing}>
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleAction(item.id, "approve")}
                        isLoading={processingId === item.id}
                      >
                        Save & Approve
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                      {item.content}
                    </p>

                    <div className="mt-3 text-xs text-gray-400">
                      Source: {item.source}
                      {item.sourceReference && ` • Ref: ${item.sourceReference.substring(0, 8)}...`}
                      {" • "}
                      {new Date(item.createdAt!).toLocaleDateString()}
                    </div>
                  </>
                )}
              </div>

              {editingId !== item.id && (
                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => startEditing(item)}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAction(item.id, "reject")}
                    isLoading={processingId === item.id}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleAction(item.id, "approve")}
                    isLoading={processingId === item.id}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Info Box */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-amber-900 dark:text-amber-100">
              Review Carefully
            </h4>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              These items were extracted by AI and may contain inaccuracies. 
              Review each item before approving to ensure the information is correct
              and useful for your knowledge base.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
