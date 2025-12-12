"use client";

import { useEffect, useCallback } from "react";
import { 
  X, 
  Download, 
  ExternalLink,
  File,
  FileText,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/Button";
import type { Attachment } from "@/lib/db/schema";

interface AttachmentPreviewProps {
  attachment: Attachment;
  onClose: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentPreview({ attachment, onClose }: AttachmentPreviewProps) {
  const isImage = attachment.contentType.startsWith("image/");
  const isPdf = attachment.contentType === "application/pdf";
  const isText = attachment.contentType.startsWith("text/");

  // Close on escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] m-4 bg-white dark:bg-gray-900 rounded-lg shadow-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3 min-w-0">
            <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
            <div className="min-w-0">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                {attachment.filename}
              </h3>
              <p className="text-xs text-gray-400">
                {formatFileSize(attachment.size)} · {attachment.contentType}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {attachment.storageUrl && (
              <>
                <a
                  href={attachment.storageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                  title="Open in new tab"
                >
                  <ExternalLink className="h-5 w-5 text-gray-500" />
                </a>
                <a
                  href={attachment.storageUrl}
                  download={attachment.filename}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                  title="Download"
                >
                  <Download className="h-5 w-5 text-gray-500" />
                </a>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {isImage && attachment.storageUrl ? (
            <div className="flex items-center justify-center h-full">
              <img
                src={attachment.storageUrl}
                alt={attachment.filename}
                className="max-w-full max-h-full object-contain rounded"
              />
            </div>
          ) : isPdf && attachment.storageUrl ? (
            <iframe
              src={attachment.storageUrl}
              className="w-full h-full min-h-[500px] rounded border border-gray-200 dark:border-gray-700"
              title={attachment.filename}
            />
          ) : isText && attachment.extractedText ? (
            <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              {attachment.extractedText}
            </pre>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <File className="h-16 w-16 mb-4" />
              <p>Preview not available for this file type</p>
              {attachment.storageUrl && (
                <a
                  href={attachment.storageUrl}
                  download={attachment.filename}
                  className="mt-4"
                >
                  <Button>
                    <Download className="h-4 w-4 mr-2" />
                    Download File
                  </Button>
                </a>
              )}
            </div>
          )}
        </div>

        {/* AI Summary Footer */}
        {attachment.summary && (
          <div className="border-t border-gray-200 dark:border-gray-800 px-4 py-3 bg-blue-50 dark:bg-blue-900/20">
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
                  AI Summary
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {attachment.summary}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
