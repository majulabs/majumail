import { db } from "./index";
import { labels, aiKnowledge, aiSettings } from "./schema";
import { DEFAULT_AI_SETTINGS } from "../types";

/**
 * Seed the database with initial data
 */
async function seed() {
  console.log("🌱 Seeding database...");

  // Seed system labels
  const systemLabels = [
    { name: "Inbox", color: "#3b82f6", isSystem: true, sortOrder: 0 },
    { name: "Starred", color: "#f59e0b", isSystem: true, sortOrder: 1 },
    { name: "Sent", color: "#10b981", isSystem: true, sortOrder: 2 },
    { name: "Archive", color: "#6b7280", isSystem: true, sortOrder: 3 },
    { name: "Trash", color: "#ef4444", isSystem: true, sortOrder: 4 },
    { name: "Spam", color: "#dc2626", isSystem: true, sortOrder: 5 },
  ];

  for (const label of systemLabels) {
    await db
      .insert(labels)
      .values(label)
      .onConflictDoNothing();
  }

  console.log("✅ System labels seeded");

  // Seed AI settings
  await db
    .insert(aiSettings)
    .values({
      key: "ai_config",
      value: DEFAULT_AI_SETTINGS,
    })
    .onConflictDoNothing();

  console.log("✅ AI settings seeded");

  // Seed initial knowledge base entries
  const initialKnowledge = [
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

  for (const knowledge of initialKnowledge) {
    await db
      .insert(aiKnowledge)
      .values({
        ...knowledge,
        isActive: true,
        isEditable: true,
        source: "manual",
      })
      .onConflictDoNothing();
  }

  console.log("✅ Initial knowledge base seeded");

  console.log("🎉 Seeding complete!");
}

// Run seed
seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  });
