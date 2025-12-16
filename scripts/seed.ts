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
 * 
 * IMPORTANT: Each entry should be unique - no duplicate or similar items.
 * These entries directly influence AI email composition via buildKnowledgeContext().
 * 
 * Content based on: https://www.rechnungs-api.de/
 * Tone: Young startup, casual "Du" form
 */
async function seedAIKnowledge() {
  console.log("🧠 Seeding AI knowledge base...");

  const knowledgeEntries = [
    // ============================================
    // COMPANY INFORMATION
    // ============================================
    {
      category: "company",
      title: "Über RechnungsAPI",
      content: "RechnungsAPI (rechnungs-api.de) ist eine API-Lösung für rechtskonforme deutsche E-Rechnungen. Wir helfen Entwicklern und Unternehmen, XRechnung und ZUGFeRD Dokumente einfach per API zu erstellen – ohne sich mit komplexen XML-Standards rumschlagen zu müssen.",
      sortOrder: 1,
    },
    {
      category: "company",
      title: "Unser Team",
      content: "Wir sind Marcel und Julien und haben zusammen rechnungs-api entwickelt und gegründet. Wir haben beide viel Erfahrung im Umgang mit E Rechnungen und haben eine sehr gut dokumentierte API gebaut, weil wir selber keine gute gefunen haben. Wir kooperieren mit ferd-net.de um laufend auf dem aktuellsten Stand der regularien zu bleibne. Wir antworten persönlich und schnell!",
      sortOrder: 2,
    },
    {
      category: "company",
      title: "Kontakt & Support",
      content: "E-Mail Support über support@mail.rechnungs-api.de. Enterprise-Anfragen an sales@rechnungs-api.de. Wir antworten in der Regel innerhalb weniger Stunden während der Geschäftszeiten (Mo-Fr).",
      sortOrder: 3,
    },

    // ============================================
    // PRODUCTS & SERVICES
    // ============================================
    {
      category: "products",
      title: "API-Funktionen",
      content: "Unsere REST-API ermöglicht: Erstellung von Rechnungen, Gutschriften, Angeboten, Aufträgen, Bestellungen und Lieferscheinen. E-Rechnungen in XRechnung und ZUGFeRD Format. Anpassbare PDF-Designs mit eigenen Themes, Schriftarten und Briefpapier. Automatische Generierung von Buchungssätzen für die Finanzbuchhaltung. OpenAPI/Swagger Dokumentation.",
      sortOrder: 1,
    },
    {
      category: "products",
      title: "Preise & Pläne",
      content: "Free Plan: Kostenlos, 3 Dokumente/Monat, perfekt zum Testen. Plus Plan: 24,99€/Monat (jährlich), 10.000 Dokumente/Monat, alle Dokumenttypen, anpassbare Designs. Enterprise: Individueller Preis, unbegrenzte Dokumente, Custom-Designs, Premium Support, Self-Hosting möglich. Alle Preise zzgl. USt.",
      sortOrder: 2,
    },
    {
      category: "products",
      title: "Unterstützte Formate",
      content: "E-Rechnungsformate: XRechnung (für Behörden/B2G), ZUGFeRD 2.1 (für B2B). Standard PDF für B2C. Die API kümmert sich um die komplexe UBL/XML-Generierung – du schickst einfach JSON und bekommst das fertige Dokument zurück.",
      sortOrder: 3,
    },

    // ============================================
    // COMMUNICATION STYLE (TONE)
    // ============================================
    {
      category: "tone",
      title: "Kommunikationsstil",
      content: "Wir sind ein junges Startup und kommunizieren locker und direkt. Verwende 'Du' statt 'Sie' – auch bei Neukunden. Sei freundlich, hilfsbereit und lösungsorientiert. Keine steifen Floskeln, sondern echte Gespräche auf Augenhöhe.",
      sortOrder: 1,
    },
    {
      category: "tone",
      title: "Sprache & Anrede",
      content: "Deutsche E-Mails: Immer 'Du' verwenden. Anrede z.B. 'Hey [Name],' oder 'Hi [Name],'. Englische E-Mails: Casual but professional, 'Hi [Name],' works great. Sprache der Antwort immer an die Sprache der Anfrage anpassen.",
      sortOrder: 2,
    },
    {
      category: "tone",
      title: "E-Mail Abschluss",
      content: "Deutsche E-Mails: 'Viele Grüße' oder 'Beste Grüße' + Absendername. NICHT 'Mit freundlichen Grüßen' – das ist uns zu förmlich. Englische E-Mails: 'Best,' oder 'Cheers,' + Absendername. Halte E-Mails kurz und auf den Punkt.",
      sortOrder: 3,
    },

    // ============================================
    // FAQ & TEMPLATES
    // ============================================
    {
      category: "faq",
      title: "Erste Schritte",
      content: "Zum Starten: 1) Kostenlos registrieren auf rechnungs-api.de/dashboard. 2) API-Key im Dashboard generieren. 3) API-Dokumentation unter rechnungs-api.de/docs checken. 4) Erste Test-Rechnung erstellen. Der Free Plan reicht zum Ausprobieren völlig aus!",
      sortOrder: 1,
    },
    {
      category: "faq",
      title: "XRechnung vs ZUGFeRD",
      content: "XRechnung: Pflicht für Rechnungen an deutsche Behörden (B2G). Reines XML-Format nach EU-Norm EN 16931. ZUGFeRD: Hybrid-Format mit PDF + eingebettetem XML. Ideal für B2B, weil der Empfänger das PDF auch ohne spezielle Software lesen kann. Unsere API kann beides!",
      sortOrder: 2,
    },
    {
      category: "faq",
      title: "Dokumentenspeicherung",
      content: "Generierte Dokumente werden 24 Stunden bei uns gespeichert und können in dieser Zeit abgerufen werden. Für längere Aufbewahrung: Dokumente direkt nach Erstellung in eurem eigenen System speichern. Enterprise-Kunden können längere Speicherzeiten vereinbaren.",
      sortOrder: 3,
    },

    // ============================================
    // PROCEDURES
    // ============================================
    {
      category: "procedures",
      title: "Technischer Support",
      content: "Bei technischen Problemen: Schick uns die Fehlermeldung, den Request-Body (ohne sensible Daten), und den Zeitpunkt des Fehlers. Je mehr Infos, desto schneller können wir helfen.",
      sortOrder: 1,
    },
    {
      category: "procedures",
      title: "Upgrade & Billing",
      content: "Upgrades können jederzeit im Dashboard durchgeführt werden. Zahlung läuft über Stripe (Kreditkarte). Bei Fragen zur Rechnung oder für Enterprise-Anfragen einfach an uns wenden. Wir finden immer eine Lösung!",
      sortOrder: 2,
    },
    {
      category: "procedures",
      title: "Feature Requests",
      content: "Wir freuen uns über Feedback und Feature-Wünsche! Einfach per E-Mail schicken. Wir können nicht alles umsetzen, aber wir hören zu und priorisieren nach Kundenbedarf. Beliebte Requests schaffen es oft schnell in die Roadmap.",
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