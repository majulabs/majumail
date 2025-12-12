"use client";

import { useState } from "react";
import { 
  Paperclip, 
  Download, 
  Eye, 
  File, 
  Image, 
  FileText,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { AttachmentPreview } from "./AttachmentPreview";
import type { Attachment } from "@/lib/db/schema";

interface AttachmentListProps {
  attachments: Attachment[];
  className?: string;
}

const FILE_ICONS: Record<string, React.ElementType> = {
  "image/": Image,
  "text/": FileText,
  "application/pdf": FileText,
  default: File,
};

function getFileIcon(contentType: string) {
  for (const [prefix, icon] of Object.entries(FILE_ICONS)) {
    if (prefix !== "default" && contentType.startsWith(prefix)) {
      return icon;
    }
  }
  return FILE_ICONS.default;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentList({ attachments, className }: AttachmentListProps) {
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);
  const [showAllSummaries, setShowAllSummaries] = useState(false);

  if (!attachments || attachments.length === 0) {
    return null;
  }

  const attachmentsWithSummary = attachments.filter((a) => a.summary);
  const hasSummaries = attachmentsWithSummary.length > 0;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Paperclip className="h-4 w-4" />
        <span>
          {attachments.length} attachment{attachments.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Attachment Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {attachments.map((attachment) => {
          const Icon = getFileIcon(attachment.contentType);
          const isImage = attachment.contentType.startsWith("image/");

          return (
            <div
              key={attachment.id}
              className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg group"
            >
              {/* Icon/Thumbnail */}
              {isImage && attachment.storageUrl ? (
                <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0">
                  <img
                    src={attachment.storageUrl}
                    alt={attachment.filename}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center flex-shrink-0">
                  <Icon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                  {attachment.filename}
                </p>
                <p className="text-xs text-gray-400">
                  {formatFileSize(attachment.size)}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setPreviewAttachment(attachment)}
                  className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                  title="Preview"
                >
                  <Eye className="h-4 w-4 text-gray-500" />
                </button>
                {attachment.storageUrl && (
                  <a
                    href={attachment.storageUrl}
                    download={attachment.filename}
                    className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                    title="Download"
                  >
                    <Download className="h-4 w-4 text-gray-500" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* AI Summaries */}
      {hasSummaries && (
        <div className="mt-3">
          <button
            onClick={() => setShowAllSummaries(!showAllSummaries)}
            className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            <Sparkles className="h-4 w-4" />
            <span>
              {showAllSummaries ? "Hide" : "Show"} AI summaries ({attachmentsWithSummary.length})
            </span>
            {showAllSummaries ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          {showAllSummaries && (
            <div className="mt-2 space-y-2">
              {attachmentsWithSummary.map((attachment) => (
                <div
                  key={attachment.id}
                  className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
                >
                  <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
                    {attachment.filename}
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {attachment.summary}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Preview Modal */}
      {previewAttachment && (
        <AttachmentPreview
          attachment={previewAttachment}
          onClose={() => setPreviewAttachment(null)}
        />
      )}
    </div>
  );
}
