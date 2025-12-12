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

  // System labels
  console.log("🏷️  Creating system labels...");
  await db
    .insert(labels)
    .values([
      { name: "Inbox", color: "#3b82f6", isSystem: true, autoClassify: false, sortOrder: 0 },
      { name: "Sent", color: "#10b981", isSystem: true, autoClassify: false, sortOrder: 1 },
      { name: "Starred", color: "#eab308", isSystem: true, autoClassify: false, sortOrder: 2 },
      { name: "Archived", color: "#6b7280", isSystem: true, autoClassify: false, sortOrder: 3 },
      { name: "Trash", color: "#ef4444", isSystem: true, autoClassify: false, sortOrder: 4 },
      { name: "Spam", color: "#f97316", isSystem: true, autoClassify: false, sortOrder: 5 },
    ])
    .onConflictDoNothing();

  // Custom labels
  console.log("🎨 Creating custom labels...");
  const customLabels = await db
    .insert(labels)
    .values([
      { name: "Customer Inquiry", color: "#f59e0b", sortOrder: 10 },
      { name: "Partnership", color: "#8b5cf6", sortOrder: 11 },
      { name: "Technical Support", color: "#ec4899", sortOrder: 12 },
      { name: "Billing", color: "#14b8a6", sortOrder: 13 },
    ])
    .onConflictDoNothing()
    .returning();

  // AI label rules
  console.log("🤖 Creating AI label rules...");
  const customerLabel = customLabels.find((l) => l.name === "Customer Inquiry");
  const partnerLabel = customLabels.find((l) => l.name === "Partnership");
  const techLabel = customLabels.find((l) => l.name === "Technical Support");
  const billingLabel = customLabels.find((l) => l.name === "Billing");

  const rulesToInsert = [];

  if (customerLabel) {
    rulesToInsert.push({
      labelId: customerLabel.id,
      description: "General inquiries from potential customers about our service",
      examples: [
        "Interested in your API",
        "How does RechnungsAPI work?",
        "Looking for e-invoicing solution",
      ],
      keywords: ["interested", "inquiry", "information", "demo", "trial"],
    });
  }

  if (partnerLabel) {
    rulesToInsert.push({
      labelId: partnerLabel.id,
      description: "Partnership, integration, or business collaboration proposals",
      examples: ["Partnership opportunity", "Integration proposal", "Collaboration"],
      keywords: ["partnership", "collaborate", "integrate", "reseller", "white-label"],
    });
  }

  if (techLabel) {
    rulesToInsert.push({
      labelId: techLabel.id,
      description: "Technical questions, bug reports, or API issues",
      examples: ["API returning error", "Integration help needed", "Bug report"],
      keywords: ["error", "bug", "issue", "API", "endpoint", "integration", "technical"],
    });
  }

  if (billingLabel) {
    rulesToInsert.push({
      labelId: billingLabel.id,
      description: "Billing, payment, invoice, or pricing questions",
      examples: ["Invoice question", "Payment failed", "Pricing inquiry"],
      keywords: ["invoice", "payment", "billing", "price", "pricing", "cost", "subscription"],
    });
  }

  if (rulesToInsert.length > 0) {
    await db.insert(aiLabelRules).values(rulesToInsert).onConflictDoNothing();
  }

  // AI context
  console.log("📚 Creating AI context...");
  await db
    .insert(aiContext)
    .values([
      {
        key: "company_info",
        title: "Company Information",
        content: `RechnungsAPI is a German e-invoicing API service (www.rechnungs-api.de). 
We convert JSON to XRechnung and ZUGFeRD formats for compliance with German B2B e-invoicing mandates. 
Our API is simple to integrate and handles all the complexity of German e-invoicing standards.
Founded by Marcel and Julien, both developers with a focus on making e-invoicing simple.`,
      },
      {
        key: "tone",
        title: "Communication Tone",
        content: `Professional but friendly. We are a small startup (two founders: Marcel and Julien) so we can be personable.
Write in German unless the conversation is in English.
Keep emails concise and helpful.
Be direct but polite.`,
      },
      {
        key: "pricing",
        title: "Pricing Information",
        content: `Contact us for pricing details. We offer flexible plans based on invoice volume.
We have a free tier for testing and small volumes.
Enterprise pricing available for high-volume customers.`,
      },
    ])
    .onConflictDoNothing();

  console.log("✅ Seed completed!");
}

async function main() {
  await reset();
  await seed();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Reset/Seed failed:", error);
    process.exit(1);
  });