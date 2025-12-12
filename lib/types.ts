import type { 
  Thread, 
  Email, 
  Label, 
  ThreadLabel, 
  Contact, 
  ContactKnowledge,
  AIKnowledge,
  AIKnowledgePending,
  Attachment
} from "./db/schema";

// Thread with relations
export interface ThreadWithRelations extends Thread {
  emails: EmailWithAttachments[];
  labels: (ThreadLabel & { label: Label })[];
}

// Email with attachments
export interface EmailWithAttachments extends Email {
  attachments?: Attachment[];
}

// Label with count
export interface LabelWithCount extends Label {
  threadCount: number;
  unreadCount?: number;
}

// Contact with relations
export interface ContactWithRelations extends Contact {
  knowledge?: ContactKnowledge[];
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
  senderName?: string;
}

// Compose AI response
export interface ComposeResponse {
  draft: string;
  suggestedSubject?: string;
}

// Smart Reply suggestion
export interface SmartReplySuggestion {
  id: string;
  text: string;
  type: "positive" | "negative" | "neutral" | "question";
  preview: string;
}

// Thread Summary
export interface ThreadSummary {
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  sentiment: "positive" | "negative" | "neutral";
  participants: {
    email: string;
    name?: string;
    messageCount: number;
  }[];
}

// Knowledge extraction result
export interface KnowledgeExtraction {
  category: string;
  title: string;
  content: string;
  confidence: number;
  contactId?: string;
  field?: string;
}

// Attachment summary result
export interface AttachmentSummary {
  filename: string;
  contentType: string;
  size: number;
  summary: string;
  extractedText?: string;
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
  attachments?: {
    filename: string;
    content: string; // Base64 encoded
    contentType: string;
  }[];
}

// Resend inbound webhook payload
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
export type SSEEventType = "new_email" | "thread_updated" | "label_changed" | "contact_updated";

export interface SSEEvent {
  type: SSEEventType;
  data: {
    threadId?: string;
    emailId?: string;
    labelId?: string;
    contactId?: string;
  };
}

// AI Settings
export interface AISettingsConfig {
  autoLearnFromEmails: boolean;
  autoLearnConfidenceThreshold: number; // 0-100
  autoCreateContacts: boolean;
  generateThreadSummaries: boolean;
  generateSmartReplies: boolean;
  summarizeAttachments: boolean;
}

// Contact insights for sidebar
export interface ContactInsights {
  contact: Contact;
  knowledge: ContactKnowledge[];
  recentTopics: string[];
  conversationCount: number;
  relationshipScore: number; // 0-100
  suggestedTopics: string[];
  lastInteraction?: Date;
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

// Default AI Settings
export const DEFAULT_AI_SETTINGS: AISettingsConfig = {
  autoLearnFromEmails: true,
  autoLearnConfidenceThreshold: 80,
  autoCreateContacts: true,
  generateThreadSummaries: true,
  generateSmartReplies: true,
  summarizeAttachments: true,
};
