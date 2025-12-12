import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  jsonb,
  integer,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ============================================
// USERS TABLE
// ============================================
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").unique().notNull(),
  name: text("name"),
  image: text("image"),
  emailVerified: timestamp("email_verified"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Auth.js required tables
export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => [primaryKey({ columns: [table.provider, table.providerAccountId] })]
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires").notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires").notNull(),
  },
  (table) => [primaryKey({ columns: [table.identifier, table.token] })]
);

// ============================================
// MAILBOXES (sender identities)
// ============================================
export const mailboxes = pgTable("mailboxes", {
  id: uuid("id").defaultRandom().primaryKey(),
  address: text("address").unique().notNull(),
  displayName: text("display_name"),
  isShared: boolean("is_shared").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================
// LABELS (folders/categories)
// ============================================
export const labels = pgTable("labels", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  color: text("color").default("#6b7280"),
  isSystem: boolean("is_system").default(false),
  autoClassify: boolean("auto_classify").default(false),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================
// THREADS (conversation groupings)
// ============================================
export const threads = pgTable(
  "threads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    subject: text("subject"),
    snippet: text("snippet"),
    participantAddresses: text("participant_addresses").array(),
    isRead: boolean("is_read").default(false),
    isStarred: boolean("is_starred").default(false),
    isArchived: boolean("is_archived").default(false),
    isTrashed: boolean("is_trashed").default(false),
    lastMessageAt: timestamp("last_message_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("threads_last_message_at_idx").on(table.lastMessageAt),
    index("threads_is_read_idx").on(table.isRead),
  ]
);

// ============================================
// THREAD LABELS (many-to-many)
// ============================================
export const threadLabels = pgTable(
  "thread_labels",
  {
    threadId: uuid("thread_id")
      .notNull()
      .references(() => threads.id, { onDelete: "cascade" }),
    labelId: uuid("label_id")
      .notNull()
      .references(() => labels.id, { onDelete: "cascade" }),
    appliedBy: text("applied_by").default("user"),
    confidence: integer("confidence"),
    appliedAt: timestamp("applied_at").defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.threadId, table.labelId] }),
    index("thread_labels_thread_id_idx").on(table.threadId),
    index("thread_labels_label_id_idx").on(table.labelId),
  ]
);

// ============================================
// EMAILS (individual messages)
// ============================================
export const emails = pgTable(
  "emails",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    threadId: uuid("thread_id").references(() => threads.id, {
      onDelete: "cascade",
    }),
    resendId: text("resend_id"),
    messageId: text("message_id"),
    inReplyTo: text("in_reply_to"),
    referencesHeader: text("references_header").array(),
    direction: text("direction").notNull(),
    fromAddress: text("from_address").notNull(),
    fromName: text("from_name"),
    toAddresses: text("to_addresses").array().notNull(),
    ccAddresses: text("cc_addresses").array().default([]),
    bccAddresses: text("bcc_addresses").array().default([]),
    replyTo: text("reply_to"),
    subject: text("subject"),
    bodyText: text("body_text"),
    bodyHtml: text("body_html"),
    headers: jsonb("headers").default({}),
    sentAt: timestamp("sent_at"),
    createdAt: timestamp("created_at").defaultNow(),
    // AI-generated fields
    summary: text("summary"),
    sentiment: text("sentiment"),
    actionItems: text("action_items").array(),
  },
  (table) => [
    index("emails_thread_id_idx").on(table.threadId),
    index("emails_message_id_idx").on(table.messageId),
    index("emails_sent_at_idx").on(table.sentAt),
  ]
);

// ============================================
// ATTACHMENTS (file attachments for emails)
// ============================================
export const attachments = pgTable(
  "attachments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    emailId: uuid("email_id").references(() => emails.id, { onDelete: "cascade" }),
    filename: text("filename").notNull(),
    contentType: text("content_type").notNull(),
    size: integer("size").notNull(),
    storageUrl: text("storage_url"), // URL to stored file
    storageKey: text("storage_key"), // Key for cloud storage
    // AI-generated fields
    summary: text("summary"),
    extractedText: text("extracted_text"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("attachments_email_id_idx").on(table.emailId),
  ]
);

// ============================================
// AI KNOWLEDGE BASE (categorized context)
// ============================================
export const aiKnowledge = pgTable(
  "ai_knowledge",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    category: text("category").notNull(), // 'company', 'products', 'tone', 'faq', 'procedures', 'custom'
    title: text("title").notNull(),
    content: text("content").notNull(),
    metadata: jsonb("metadata").default({}),
    isActive: boolean("is_active").default(true),
    isEditable: boolean("is_editable").default(true),
    source: text("source").default("manual"), // 'manual', 'email_inbound', 'email_outbound', 'attachment'
    sourceReference: text("source_reference"), // Email ID or attachment ID
    confidence: integer("confidence"), // For AI-extracted info (1-100)
    sortOrder: integer("sort_order").default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("ai_knowledge_category_idx").on(table.category),
    index("ai_knowledge_is_active_idx").on(table.isActive),
  ]
);

// ============================================
// AI KNOWLEDGE PENDING (items awaiting review)
// ============================================
export const aiKnowledgePending = pgTable(
  "ai_knowledge_pending",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    category: text("category").notNull(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    metadata: jsonb("metadata").default({}),
    source: text("source").notNull(),
    sourceReference: text("source_reference"),
    confidence: integer("confidence").notNull(),
    status: text("status").default("pending"), // 'pending', 'approved', 'rejected'
    reviewedAt: timestamp("reviewed_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("ai_knowledge_pending_status_idx").on(table.status),
  ]
);

// ============================================
// AI CONTEXT (legacy - keep for migration)
// ============================================
export const aiContext = pgTable("ai_context", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").unique().notNull(),
  title: text("title"),
  content: text("content").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================
// AI LABEL RULES (for classification)
// ============================================
export const aiLabelRules = pgTable("ai_label_rules", {
  id: uuid("id").defaultRandom().primaryKey(),
  labelId: uuid("label_id").references(() => labels.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  examples: text("examples").array(),
  keywords: text("keywords").array(),
  senderPatterns: text("sender_patterns").array(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================
// AI SETTINGS (global AI configuration)
// ============================================
export const aiSettings = pgTable("ai_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").unique().notNull(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================
// CONTACTS (enhanced with AI fields)
// ============================================
export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").unique().notNull(),
    name: text("name"),
    
    // Structured data
    company: text("company"),
    role: text("role"),
    phone: text("phone"),
    website: text("website"),
    location: text("location"),
    timezone: text("timezone"),
    linkedIn: text("linkedin"),
    
    // Relationship data
    type: text("type").default("contact"), // 'lead', 'customer', 'partner', 'vendor', 'personal'
    status: text("status").default("active"), // 'active', 'inactive', 'churned'
    
    // AI-populated fields
    summary: text("summary"), // AI-generated relationship summary
    interests: text("interests").array(), // Topics they're interested in
    communicationStyle: text("communication_style"), // 'formal', 'casual', 'technical'
    language: text("language").default("de"), // Preferred language
    lastInteractionSummary: text("last_interaction_summary"),
    
    // User-editable
    avatarUrl: text("avatar_url"),
    notes: text("notes"),
    tags: text("tags").array(),
    
    // Stats
    emailCount: integer("email_count").default(0),
    inboundCount: integer("inbound_count").default(0),
    outboundCount: integer("outbound_count").default(0),
    lastContactedAt: timestamp("last_contacted_at"),
    firstContactedAt: timestamp("first_contacted_at"),
    
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("contacts_email_idx").on(table.email),
    index("contacts_type_idx").on(table.type),
    index("contacts_last_contacted_idx").on(table.lastContactedAt),
  ]
);

// ============================================
// CONTACT KNOWLEDGE (additional info about contacts)
// ============================================
export const contactKnowledge = pgTable(
  "contact_knowledge",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    field: text("field").notNull(), // 'preference', 'history', 'requirement', 'note'
    value: text("value").notNull(),
    source: text("source").default("manual"), // 'manual', 'ai_extracted'
    sourceReference: text("source_reference"), // Email ID
    confidence: integer("confidence"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("contact_knowledge_contact_id_idx").on(table.contactId),
  ]
);

// ============================================
// RELATIONS
// ============================================
export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const threadsRelations = relations(threads, ({ many }) => ({
  emails: many(emails),
  labels: many(threadLabels),
}));

export const emailsRelations = relations(emails, ({ one, many }) => ({
  thread: one(threads, {
    fields: [emails.threadId],
    references: [threads.id],
  }),
  attachments: many(attachments),
}));

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  email: one(emails, {
    fields: [attachments.emailId],
    references: [emails.id],
  }),
}));

export const labelsRelations = relations(labels, ({ many }) => ({
  threads: many(threadLabels),
  rules: many(aiLabelRules),
}));

export const threadLabelsRelations = relations(threadLabels, ({ one }) => ({
  thread: one(threads, {
    fields: [threadLabels.threadId],
    references: [threads.id],
  }),
  label: one(labels, {
    fields: [threadLabels.labelId],
    references: [labels.id],
  }),
}));

export const aiLabelRulesRelations = relations(aiLabelRules, ({ one }) => ({
  label: one(labels, {
    fields: [aiLabelRules.labelId],
    references: [labels.id],
  }),
}));

export const contactsRelations = relations(contacts, ({ many }) => ({
  knowledge: many(contactKnowledge),
}));

export const contactKnowledgeRelations = relations(contactKnowledge, ({ one }) => ({
  contact: one(contacts, {
    fields: [contactKnowledge.contactId],
    references: [contacts.id],
  }),
}));

// ============================================
// TYPE EXPORTS
// ============================================
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Mailbox = typeof mailboxes.$inferSelect;
export type NewMailbox = typeof mailboxes.$inferInsert;
export type Label = typeof labels.$inferSelect;
export type NewLabel = typeof labels.$inferInsert;
export type Thread = typeof threads.$inferSelect;
export type NewThread = typeof threads.$inferInsert;
export type ThreadLabel = typeof threadLabels.$inferSelect;
export type NewThreadLabel = typeof threadLabels.$inferInsert;
export type Email = typeof emails.$inferSelect;
export type NewEmail = typeof emails.$inferInsert;
export type Attachment = typeof attachments.$inferSelect;
export type NewAttachment = typeof attachments.$inferInsert;
export type AIKnowledge = typeof aiKnowledge.$inferSelect;
export type NewAIKnowledge = typeof aiKnowledge.$inferInsert;
export type AIKnowledgePending = typeof aiKnowledgePending.$inferSelect;
export type NewAIKnowledgePending = typeof aiKnowledgePending.$inferInsert;
export type AIContext = typeof aiContext.$inferSelect;
export type NewAIContext = typeof aiContext.$inferInsert;
export type AILabelRule = typeof aiLabelRules.$inferSelect;
export type NewAILabelRule = typeof aiLabelRules.$inferInsert;
export type AISettings = typeof aiSettings.$inferSelect;
export type NewAISettings = typeof aiSettings.$inferInsert;
export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
export type ContactKnowledge = typeof contactKnowledge.$inferSelect;
export type NewContactKnowledge = typeof contactKnowledge.$inferInsert;

// ============================================
// CONSTANTS
// ============================================
export const AI_KNOWLEDGE_CATEGORIES = [
  { id: "company", name: "Company Information", description: "Details about your company, team, and mission" },
  { id: "products", name: "Products & Services", description: "Information about what you offer" },
  { id: "tone", name: "Communication Style", description: "How you want emails to sound" },
  { id: "faq", name: "FAQ & Templates", description: "Common questions and response templates" },
  { id: "procedures", name: "Procedures", description: "Business processes and workflows" },
  { id: "custom", name: "Custom Knowledge", description: "Other relevant information" },
] as const;

export const CONTACT_TYPES = [
  { id: "lead", name: "Lead", color: "#f59e0b" },
  { id: "customer", name: "Customer", color: "#22c55e" },
  { id: "partner", name: "Partner", color: "#8b5cf6" },
  { id: "vendor", name: "Vendor", color: "#06b6d4" },
  { id: "personal", name: "Personal", color: "#ec4899" },
  { id: "contact", name: "Contact", color: "#6b7280" },
] as const;

export const CONTACT_STATUSES = [
  { id: "active", name: "Active", color: "#22c55e" },
  { id: "inactive", name: "Inactive", color: "#6b7280" },
  { id: "churned", name: "Churned", color: "#ef4444" },
] as const;
