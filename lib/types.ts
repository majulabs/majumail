import type { Thread, Email, Label, ThreadLabel } from "./db/schema";

// Thread with relations
export interface ThreadWithRelations extends Thread {
  emails: Email[];
  labels: (ThreadLabel & { label: Label })[];
}

// Label with count
export interface LabelWithCount extends Label {
  threadCount: number;
}

// AI Classification result
export interface ClassificationResult {
  labelId: string;
  labelName: string;
  confidence: number;
  reason?: string;
}

// Compose AI request
export interface ComposeRequest {
  threadId?: string;
  instruction: string;
  additionalContext?: string;
}

// Compose AI response
export interface ComposeResponse {
  draft: string;
  suggestedSubject?: string;
}

// Send email request
export interface SendEmailRequest {
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  bodyHtml?: string;
  replyToThreadId?: string;
  inReplyTo?: string;
  references?: string[];
}

// Resend inbound webhook payload
// Note: The webhook payload structure may vary - some fields are optional
export interface ResendInboundPayload {
  type: "email.received" | "email.sent" | "email.delivered" | "email.bounced" | "email.complained";
  created_at?: string;
  data: {
    email_id?: string;
    from: string;
    to: string[];
    cc?: string[];
    bcc?: string[];
    reply_to?: string;
    subject: string;
    text?: string;
    html?: string;
    message_id?: string;
    created_at?: string;
    attachments?: Array<{
      filename: string;
      content_type: string;
      content: string;
    }>;
    headers?: Array<{
      name: string;
      value: string;
    }>;
  };
}

// SSE event types
export type SSEEventType = "new_email" | "thread_updated" | "label_changed";

export interface SSEEvent {
  type: SSEEventType;
  data: {
    threadId?: string;
    emailId?: string;
    labelId?: string;
  };
}

// Label colors
export const LABEL_COLORS = [
  { name: "Gray", value: "#6b7280" },
  { name: "Red", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Yellow", value: "#eab308" },
  { name: "Lime", value: "#84cc16" },
  { name: "Green", value: "#22c55e" },
  { name: "Emerald", value: "#10b981" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Sky", value: "#0ea5e9" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Purple", value: "#a855f7" },
  { name: "Fuchsia", value: "#d946ef" },
  { name: "Pink", value: "#ec4899" },
  { name: "Rose", value: "#f43f5e" },
] as const;
