"use client";

import { useState, useEffect } from "react";
import { Eye, X, Monitor, Smartphone, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import type { EmailTemplateType } from "@/lib/email/template";

interface EmailPreviewProps {
  body: string;
  templateType: EmailTemplateType;
  senderName?: string;
  isOpen: boolean;
  onClose: () => void;
}

type PreviewMode = "desktop" | "mobile";

export function EmailPreview({
  body,
  templateType,
  senderName,
  isOpen,
  onClose,
}: EmailPreviewProps) {
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("desktop");
  const [error, setError] = useState<string | null>(null);

  // Generate preview when props change
  useEffect(() => {
    if (!isOpen || !body.trim()) {
      setPreviewHtml("");
      return;
    }

    const generatePreview = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/emails/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            body,
            templateType,
            senderName,
          }),
        });

        if (!res.ok) {
          throw new Error("Failed to generate preview");
        }

        const data = await res.json();
        setPreviewHtml(data.html || "");
      } catch (err) {
        setError((err as Error).message);
        setPreviewHtml("");
      } finally {
        setIsLoading(false);
      }
    };

    generatePreview();
  }, [isOpen, body, templateType, senderName]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-gray-900 rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <Eye className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Email Preview
            </h2>
            <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
              {templateType === "branded"
                ? "Branded"
                : templateType === "simple"
                ? "Simple"
                : "Plain Text"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* View mode toggle */}
            <div className="flex items-center bg-gray-200 dark:bg-gray-700 rounded-lg p-0.5">
              <button
                onClick={() => setPreviewMode("desktop")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors",
                  previewMode === "desktop"
                    ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                )}
              >
                <Monitor className="h-4 w-4" />
                Desktop
              </button>
              <button
                onClick={() => setPreviewMode("mobile")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors",
                  previewMode === "mobile"
                    ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                )}
              >
                <Smartphone className="h-4 w-4" />
                Mobile
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-950 p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64 text-red-500">
              <p>{error}</p>
            </div>
          ) : !previewHtml ? (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <p>Enter some text to see the preview</p>
            </div>
          ) : (
            <div
              className={cn(
                "mx-auto bg-white shadow-lg transition-all duration-300",
                previewMode === "desktop" ? "max-w-[700px]" : "max-w-[375px]"
              )}
            >
              <iframe
                srcDoc={previewHtml}
                className={cn(
                  "w-full border-0 transition-all duration-300",
                  previewMode === "desktop" ? "h-[600px]" : "h-[700px]"
                )}
                title="Email Preview"
                sandbox="allow-same-origin"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            This is a preview of how your email will appear to recipients.
            Actual rendering may vary slightly between email clients.
          </p>
        </div>
      </div>
    </div>
  );
}
