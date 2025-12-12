"use client";

import { Paperclip, Download, FileText, Image, File } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { formatFullDate } from "@/lib/utils/format";
import { sanitizeHtml } from "@/lib/utils/email-parser";
import { cn } from "@/lib/utils/cn";
import type { Email } from "@/lib/db/schema";

interface Attachment {
  id: string;
  filename: string;
  contentType: string;
  size?: number;
  storageUrl?: string | null;
  summary?: string | null;
}

interface EmailWithAttachments extends Email {
  attachments?: Attachment[] | null;
}

interface EmailMessageProps {
  email: EmailWithAttachments;
  isExpanded?: boolean;
  onToggle?: () => void;
}

function formatFileSize(bytes: number | undefined): string {
  if (!bytes || bytes === 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(contentType: string) {
  if (contentType.startsWith("image/")) return Image;
  if (contentType.includes("pdf") || contentType.startsWith("text/")) return FileText;
  return File;
}

export function EmailMessage({
  email,
  isExpanded = true,
  onToggle,
}: EmailMessageProps) {
  const isOutbound = email.direction === "outbound";
  const attachments = (email.attachments || []) as Attachment[];
  const hasAttachments = attachments.length > 0;

  return (
    <div
      className={cn(
        "border rounded-lg",
        isOutbound
          ? "border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-900/10"
          : "border-gray-200 dark:border-gray-700"
      )}
    >
      {/* Header */}
      <div
        className="flex items-start gap-3 p-4 cursor-pointer"
        onClick={onToggle}
      >
        <Avatar email={email.fromAddress} name={email.fromName} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                {email.fromName || email.fromAddress}
              </span>
              {isOutbound && (
                <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 rounded">
                  Sent
                </span>
              )}
              {hasAttachments && (
                <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                  <Paperclip className="h-3 w-3" />
                  {attachments.length}
                </span>
              )}
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
              {formatFullDate(email.sentAt)}
            </span>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
            To: {email.toAddresses.join(", ")}
            {email.ccAddresses && email.ccAddresses.length > 0 && (
              <span className="ml-2">CC: {email.ccAddresses.join(", ")}</span>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      {isExpanded && (
        <div className="px-4 pb-4">
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            {email.bodyHtml ? (
              <div
                className="prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{
                  __html: sanitizeHtml(email.bodyHtml),
                }}
              />
            ) : (
              <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 font-sans">
                {email.bodyText}
              </pre>
            )}
          </div>

          {/* Attachments */}
          {hasAttachments && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Attachments ({attachments.length})
              </p>
              <div className="grid gap-2">
                {attachments.map((attachment) => {
                  const FileIcon = getFileIcon(attachment.contentType);
                  const fileSize = formatFileSize(attachment.size);
                  const hasDownloadUrl = !!attachment.storageUrl;

                  return (
                    <div
                      key={attachment.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border",
                        "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                      )}
                    >
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        <FileIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {attachment.filename}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {attachment.contentType}
                          {fileSize && ` • ${fileSize}`}
                        </p>
                        {attachment.summary && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                            {attachment.summary}
                          </p>
                        )}
                      </div>
                      {hasDownloadUrl && (
                        <a
                          href={attachment.storageUrl!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0 p-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Download"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Download className="h-5 w-5" />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}