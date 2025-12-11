import { Avatar } from "@/components/ui/Avatar";
import { formatFullDate } from "@/lib/utils/format";
import { sanitizeHtml } from "@/lib/utils/email-parser";
import { cn } from "@/lib/utils/cn";
import type { Email } from "@/lib/db/schema";

interface EmailMessageProps {
  email: Email;
  isExpanded?: boolean;
  onToggle?: () => void;
}

export function EmailMessage({
  email,
  isExpanded = true,
  onToggle,
}: EmailMessageProps) {
  const isOutbound = email.direction === "outbound";

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
          {(() => {
            const attachments = email.attachments as Array<{ filename: string }> | null;
            if (!attachments || attachments.length === 0) return null;
            return (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Attachments ({attachments.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {attachments.map((attachment, index) => (
                    <div
                      key={index}
                      className="px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm text-gray-700 dark:text-gray-300"
                    >
                      {attachment.filename}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
