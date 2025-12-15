#!/usr/bin/env tsx
/**
 * MajuMail Database Seed Script
 * 
 * Usage:
 *   npm run db:seed          # Seed data (incremental, won't duplicate)
 *   npm run db:reset         # Reset and seed (clears all data first)
 * 
 * This script consolidates the previous seed.ts and reset-and-seed.ts files.
 */

import "dotenv/config";
import { db } from "../lib/db";
import { sql } from "drizzle-orm";
import {
  mailboxes,
  labels,
  aiKnowledge,
  aiSettings,
  aiLabelRules,
  threads,
  emails,
  threadLabels,
  contacts,
  contactKnowledge,
  attachments,
  aiKnowledgePending,
} from "../lib/db/schema";
import { DEFAULT_AI_SETTINGS } from "../lib/types";

// Check if --reset flag was passed
const shouldReset = process.argv.includes("--reset");

/**
 * Reset all data in the database
 */
async function resetDatabase() {
  console.log("🗑️  Resetting database...\n");

  // Delete in order to respect foreign key constraints
  const tables = [
    { name: "thread labels", table: threadLabels },
    { name: "attachments", table: attachments },
    { name: "emails", table: emails },
    { name: "threads", table: threads },
    { name: "AI label rules", table: aiLabelRules },
    { name: "AI knowledge pending", table: aiKnowledgePending },
    { name: "AI knowledge", table: aiKnowledge },
    { name: "AI settings", table: aiSettings },
    { name: "contact knowledge", table: contactKnowledge },
    { name: "contacts", table: contacts },
    { name: "labels", table: labels },
    { name: "mailboxes", table: mailboxes },
  ];

  for (const { name, table } of tables) {
    console.log(`  Deleting ${name}...`);
    await db.delete(table);
  }

  console.log("\n✅ Database reset complete!\n");
}

/**
 * Seed mailboxes
 */
async function seedMailboxes() {
  console.log("📬 Seeding mailboxes...");

  const mailboxData = [
    { address: "marcel@mail.rechnungs-api.de", displayName: "Marcel" },
    { address: "julien@mail.rechnungs-api.de", displayName: "Julien" },
    { address: "support@mail.rechnungs-api.de", displayName: "Support", isShared: true },
    { address: "info@mail.rechnungs-api.de", displayName: "Info", isShared: true },
  ];

  for (const mailbox of mailboxData) {
    await db.insert(mailboxes).values(mailbox).onConflictDoNothing();
  }

  console.log("  ✓ Mailboxes seeded");
}

/**
 * Seed system and custom labels
 */
async function seedLabels() {
  console.log("🏷️  Seeding labels...");

  // System labels
  const systemLabels = [
    { name: "Inbox", color: "#3b82f6", isSystem: true, autoClassify: false, sortOrder: 0 },
    { name: "Sent", color: "#10b981", isSystem: true, autoClassify: false, sortOrder: 1 },
    { name: "Starred", color: "#eab308", isSystem: true, autoClassify: false, sortOrder: 2 },
    { name: "Archived", color: "#6b7280", isSystem: true, autoClassify: false, sortOrder: 3 },
    { name: "Spam", color: "#f97316", isSystem: true, autoClassify: false, sortOrder: 4 },
    { name: "Trash", color: "#ef4444", isSystem: true, autoClassify: false, sortOrder: 5 },
  ];

  for (const label of systemLabels) {
    await db.insert(labels).values(label).onConflictDoNothing();
  }
  console.log("  ✓ System labels seeded");

  // Custom labels for classification
  const customLabels = [
    { name: "Invoice", color: "#8b5cf6", isSystem: false, autoClassify: true, sortOrder: 10 },
    { name: "Support", color: "#06b6d4", isSystem: false, autoClassify: true, sortOrder: 11 },
    { name: "Partnership", color: "#ec4899", isSystem: false, autoClassify: true, sortOrder: 12 },
    { name: "Newsletter", color: "#84cc16", isSystem: false, autoClassify: true, sortOrder: 13 },
    { name: "Personal", color: "#f59e0b", isSystem: false, autoClassify: true, sortOrder: 14 },
  ];

  for (const label of customLabels) {
    await db.insert(labels).values(label).onConflictDoNothing();
  }
  console.log("  ✓ Custom labels seeded");
}

/**
 * Seed AI label rules
 */
async function seedAILabelRules() {
  console.log("🤖 Seeding AI label rules...");

  // Fetch created labels
  const allLabels = await db.select().from(labels);
  const labelMap = new Map(allLabels.map((l) => [l.name, l.id]));

  const rules = [
    {
      labelName: "Invoice",
      description: "Invoices, bills, payment requests, receipts",
      keywords: ["invoice", "rechnung", "payment", "bill", "receipt", "zahlung", "fälligkeit"],
      examples: ["Your invoice is ready", "Payment confirmation", "Ihre Rechnung"],
      senderPatterns: ["billing@", "invoices@", "accounting@"],
    },
    {
      labelName: "Support",
      description: "Customer support requests, bug reports, help requests",
      keywords: ["help", "support", "bug", "error", "problem", "issue", "hilfe", "fehler"],
      examples: ["I need help with", "Getting an error", "Bug report"],
      senderPatterns: [],
    },
    {
      labelName: "Partnership",
      description: "Partnership inquiries, collaboration requests, business proposals",
      keywords: ["partnership", "collaborate", "cooperation", "business proposal", "zusammenarbeit"],
      examples: ["Partnership opportunity", "Let's collaborate"],
      senderPatterns: [],
    },
    {
      labelName: "Newsletter",
      description: "Newsletters, marketing emails, announcements",
      keywords: ["newsletter", "unsubscribe", "update", "digest", "weekly", "monthly"],
      examples: ["Our weekly newsletter", "Don't miss out"],
      senderPatterns: ["newsletter@", "news@", "updates@", "marketing@"],
    },
    {
      labelName: "Personal",
      description: "Personal emails from individuals, not business-related",
      keywords: [],
      examples: ["How are you?", "Catch up soon"],
      senderPatterns: ["@gmail.com", "@outlook.com", "@yahoo.com", "@icloud.com"],
    },
  ];

  for (const rule of rules) {
    const labelId = labelMap.get(rule.labelName);
    if (labelId) {
      await db
        .insert(aiLabelRules)
        .values({
          labelId,
          description: rule.description,
          keywords: rule.keywords,
          examples: rule.examples,
          senderPatterns: rule.senderPatterns,
          isActive: true,
        })
        .onConflictDoNothing();
    }
  }

  console.log("  ✓ AI label rules seeded");
}

/**
 * Seed AI settings
 */
async function seedAISettings() {
  console.log("⚙️  Seeding AI settings...");

  await db
    .insert(aiSettings)
    .values({
      key: "ai_config",
      value: DEFAULT_AI_SETTINGS,
    })
    .onConflictDoNothing();

  console.log("  ✓ AI settings seeded");
}

/**
 * Seed initial AI knowledge base
 */
async function seedAIKnowledge() {
  console.log("🧠 Seeding AI knowledge base...");

  const knowledgeEntries = [
    {
      category: "company",
      title: "Company Name",
      content: "rechnungs-api.de - German invoice API service for developers and businesses.",
      sortOrder: 1,
    },
    {
      category: "company",
      title: "Team Members",
      content: "Marcel and Julien are the main team members handling customer communications and support.",
      sortOrder: 2,
    },
    {
      category: "tone",
      title: "Communication Style",
      content: "We communicate in a professional but friendly manner. Use German (Sie form) for German-speaking clients, English for international clients. Keep emails concise, helpful, and solution-oriented.",
      sortOrder: 1,
    },
    {
      category: "tone",
      title: "Email Signature",
      content: 'Always sign off with "Mit freundlichen Grüßen" for German emails and "Best regards" for English emails, followed by the sender\'s name.',
      sortOrder: 2,
    },
    {
      category: "tone",
      title: "Language Detection",
      content: "Match the language of the incoming email. If the sender writes in German, respond in German. If they write in English, respond in English.",
      sortOrder: 3,
    },
  ];

  for (const entry of knowledgeEntries) {
    await db
      .insert(aiKnowledge)
      .values({
        ...entry,
        isActive: true,
        isEditable: true,
        source: "manual",
      })
      .onConflictDoNothing();
  }

  console.log("  ✓ AI knowledge base seeded");
}

/**
 * Main seed function
 */
async function seed() {
  console.log("🌱 Starting database seed...\n");

  if (shouldReset) {
    await resetDatabase();
  }

  await seedMailboxes();
  await seedLabels();
  await seedAILabelRules();
  await seedAISettings();
  await seedAIKnowledge();

  console.log("\n🎉 Seeding complete!");
}

// Run
seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Seeding failed:", error);
    process.exit(1);
  });