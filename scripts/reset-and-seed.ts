import "dotenv/config";
import { db } from "../lib/db";
import { sql } from "drizzle-orm";
import {
  mailboxes,
  labels,
  aiContext,
  aiLabelRules,
  threads,
  emails,
  threadLabels,
  contacts,
} from "../lib/db/schema";

async function reset() {
  console.log("🗑️  Resetting database...");

  // Delete in correct order to respect foreign key constraints
  console.log("  Deleting thread labels...");
  await db.delete(threadLabels);

  console.log("  Deleting emails...");
  await db.delete(emails);

  console.log("  Deleting threads...");
  await db.delete(threads);

  console.log("  Deleting AI label rules...");
  await db.delete(aiLabelRules);

  console.log("  Deleting labels...");
  await db.delete(labels);

  console.log("  Deleting mailboxes...");
  await db.delete(mailboxes);

  console.log("  Deleting contacts...");
  await db.delete(contacts);

  console.log("  Deleting AI context...");
  await db.delete(aiContext);

  console.log("✅ Database reset complete!\n");
}

async function seed() {
  console.log("🌱 Starting seed...");

  // Mailboxes
  console.log("📬 Creating mailboxes...");
  await db
    .insert(mailboxes)
    .values([
      { address: "marcel@mail.rechnungs-api.de", displayName: "Marcel" },
      { address: "julien@mail.rechnungs-api.de", displayName: "Julien" },
      { address: "support@mail.rechnungs-api.de", displayName: "Support", isShared: true },
      { address: "info@mail.rechnungs-api.de", displayName: "Info", isShared: true },
    ])
    .onConflictDoNothing();

  // System labels - including Spam
  console.log("🏷️  Creating system labels...");
  await db
    .insert(labels)
    .values([
      { name: "Inbox", color: "#3b82f6", isSystem: true, autoClassify: false, sortOrder: 0 },
      { name: "Sent", color: "#10b981", isSystem: true, autoClassify: false, sortOrder: 1 },
      { name: "Starred", color: "#eab308", isSystem: true, autoClassify: false, sortOrder: 2 },
      { name: "Archived", color: "#6b7280", isSystem: true, autoClassify: false, sortOrder: 3 },
      { name: "Spam", color: "#f97316", isSystem: true, autoClassify: false, sortOrder: 4 },
      { name: "Trash", color: "#ef4444", isSystem: true, autoClassify: false, sortOrder: 5 },
    ])
    .onConflictDoNothing();

  // Custom labels for classification
  console.log("🏷️  Creating custom labels...");
  await db
    .insert(labels)
    .values([
      { name: "Invoice", color: "#8b5cf6", isSystem: false, autoClassify: true, sortOrder: 10 },
      { name: "Support", color: "#06b6d4", isSystem: false, autoClassify: true, sortOrder: 11 },
      { name: "Partnership", color: "#ec4899", isSystem: false, autoClassify: true, sortOrder: 12 },
      { name: "Newsletter", color: "#84cc16", isSystem: false, autoClassify: true, sortOrder: 13 },
      { name: "Personal", color: "#f59e0b", isSystem: false, autoClassify: true, sortOrder: 14 },
    ])
    .onConflictDoNothing();

  // Fetch created labels for AI rules
  const createdLabels = await db.select().from(labels);
  const labelMap = new Map(createdLabels.map((l) => [l.name, l.id]));

  // AI Label Rules
  console.log("🤖 Creating AI label rules...");
  const aiRules = [
    {
      labelId: labelMap.get("Invoice")!,
      description: "Invoices, bills, payment requests, receipts",
      keywords: ["invoice", "rechnung", "payment", "bill", "receipt", "zahlung"],
      examples: [
        "Invoice #12345 for your subscription",
        "Your monthly bill is ready",
        "Payment confirmation",
        "Rechnung für Ihre Bestellung",
      ],
    },
    {
      labelId: labelMap.get("Support")!,
      description: "Customer support requests, bug reports, feature requests",
      keywords: ["help", "issue", "problem", "bug", "error", "support", "hilfe"],
      examples: [
        "I need help with my account",
        "Getting an error when trying to login",
        "Bug report: PDF generation fails",
        "Ich brauche Hilfe bei der API",
      ],
    },
    {
      labelId: labelMap.get("Partnership")!,
      description: "Business partnerships, collaborations, B2B inquiries",
      keywords: ["partnership", "collaboration", "business", "cooperation", "zusammenarbeit"],
      examples: [
        "Partnership inquiry from Company X",
        "Would like to discuss a collaboration",
        "B2B pricing request",
        "Interesse an einer Kooperation",
      ],
    },
    {
      labelId: labelMap.get("Newsletter")!,
      description: "Marketing emails, newsletters, promotional content",
      keywords: ["newsletter", "unsubscribe", "marketing", "promotion", "offer"],
      examples: [
        "Your weekly newsletter",
        "Special offer just for you",
        "New features announcement",
        "Unsubscribe from this list",
      ],
    },
    {
      labelId: labelMap.get("Personal")!,
      description: "Personal messages, greetings, non-business communication",
      keywords: ["personal", "hello", "greetings", "thanks", "danke", "hallo"],
      examples: [
        "Hey, how are you doing?",
        "Thanks for the great work!",
        "Just wanted to say hi",
        "Hallo, wie geht es dir?",
      ],
    },
  ];

  for (const rule of aiRules) {
    if (rule.labelId) {
      await db
        .insert(aiLabelRules)
        .values({
          labelId: rule.labelId,
          description: rule.description,
          keywords: rule.keywords,
          examples: rule.examples,
          isActive: true,
        })
        .onConflictDoNothing();
    }
  }

  // AI Context
  console.log("📚 Creating AI context...");
  const aiContextEntries = [
    {
      key: "company-info",
      title: "Company Information",
      content: `RechnungsAPI is a German fintech startup founded by Marcel and Julien. We provide invoice generation and management APIs for businesses. Our main product is a REST API that allows companies to create, send, and track invoices programmatically.

Key facts:
- Founded in 2023
- Based in Germany
- Main language: German and English
- Target audience: Developers and businesses needing invoice automation
- Pricing: Freemium with paid tiers`,
      category: "company",
      isActive: true,
    },
    {
      key: "tone-style",
      title: "Tone and Style",
      content: `Communication style for RechnungsAPI:
- Professional but friendly
- Technical when needed, but accessible
- Helpful and solution-oriented
- Bilingual: German preferred, English when appropriate
- Concise but thorough
- Always sign off as the sender (Marcel or Julien)`,
      category: "style",
      isActive: true,
    },
    {
      key: "common-responses",
      title: "Common Responses",
      content: `Frequently needed information:

API Documentation: https://docs.rechnungs-api.de
Pricing: https://rechnungs-api.de/pricing
Support Email: support@mail.rechnungs-api.de
Status Page: https://status.rechnungs-api.de

Standard response time: Within 24 hours
Business hours: Monday-Friday, 9:00-18:00 CET`,
      category: "responses",
      isActive: true,
    },
  ];
  for (const entry of aiContextEntries) {
    await db.insert(aiContext).values(entry).onConflictDoNothing();
  }

  // Sample contacts
  console.log("👥 Creating sample contacts...");
  const contactEntries = [
    { email: "customer@example.com", name: "Sample Customer", company: "Example Corp" },
    { email: "partner@business.de", name: "Business Partner", company: "Partner GmbH" },
  ];
  for (const entry of contactEntries) {
    await db.insert(contacts).values(entry).onConflictDoNothing();
  }

  console.log("\n✅ Seed complete!");
  console.log("   - 4 mailboxes created");
  console.log("   - 11 labels created (6 system + 5 custom)");
  console.log("   - 5 AI label rules created");
  console.log("   - 3 AI context entries created");
  console.log("   - 2 sample contacts created");
}

async function main() {
  const args = process.argv.slice(2);
  const shouldReset = args.includes("--reset") || args.includes("-r");

  if (shouldReset) {
    await reset();
  }

  await seed();
  process.exit(0);
}

main().catch((error) => {
  console.error("❌ Seed failed:", error);
  process.exit(1);
});