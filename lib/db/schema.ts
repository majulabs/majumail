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
// LABELS
// ============================================
export const labels = pgTable("labels", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull().default("#6b7280"),
  description: text("description"),
  isSystem: boolean("is_system").default(false),
  autoClassify: boolean("auto_classify").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================
// THREADS (conversation groups)
// ============================================
export const threads = pgTable(
  "threads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    subject: text("subject"),
    snippet: text("snippet"),
    participantAddresses: text("participant_addresses").array().default([]),
    lastMessageAt: timestamp("last_message_at").defaultNow(),
    isRead: boolean("is_read").default(false),
    isArchived: boolean("is_archived").default(false),
    isStarred: boolean("is_starred").default(false),
    isTrashed: boolean("is_trashed").default(false),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("threads_last_message_at_idx").on(table.lastMessageAt),
    index("threads_is_archived_idx").on(table.isArchived),
    index("threads_is_trashed_idx").on(table.isTrashed),
  ]
);

// ============================================
// THREAD LABELS (junction table)
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
    attachments: jsonb("attachments").default([]),
    headers: jsonb("headers").default({}),
    sentAt: timestamp("sent_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("emails_thread_id_idx").on(table.threadId),
    index("emails_message_id_idx").on(table.messageId),
    index("emails_sent_at_idx").on(table.sentAt),
  ]
);

// ============================================
// AI CONTEXT (company info for AI compose)
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
// CONTACTS (autocomplete cache)
// ============================================
export const contacts = pgTable("contacts", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").unique().notNull(),
  name: text("name"),
  lastContactedAt: timestamp("last_contacted_at"),
  contactCount: integer("contact_count").default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

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

export const emailsRelations = relations(emails, ({ one }) => ({
  thread: one(threads, {
    fields: [emails.threadId],
    references: [threads.id],
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
export type AIContext = typeof aiContext.$inferSelect;
export type NewAIContext = typeof aiContext.$inferInsert;
export type AILabelRule = typeof aiLabelRules.$inferSelect;
export type NewAILabelRule = typeof aiLabelRules.$inferInsert;
export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
