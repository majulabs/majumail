import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { aiKnowledge, aiSettings, contacts, contactKnowledge, emails } from "@/lib/db/schema";
import { eq, and, asc, desc, or, sql } from "drizzle-orm";
import type { ComposeRequest, ComposeResponse, AISettingsConfig } from "@/lib/types";
import type { Email } from "@/lib/db/schema";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Get AI settings from database
 */
async function getAISettings(): Promise<AISettingsConfig | null> {
  try {
    const [settings] = await db
      .select()
      .from(aiSettings)
      .where(eq(aiSettings.key, "ai_config"))
      .limit(1);
    
    return settings?.value as AISettingsConfig | null;
  } catch {
    return null;
  }
}

/**
 * Build context from knowledge base
 * 
 * This function fetches all active knowledge items and formats them
 * for use in AI prompts. The knowledge base directly influences how
 * the AI composes emails.
 */
async function buildKnowledgeContext(): Promise<string> {
  const knowledge = await db
    .select()
    .from(aiKnowledge)
    .where(eq(aiKnowledge.isActive, true))
    .orderBy(asc(aiKnowledge.sortOrder), asc(aiKnowledge.createdAt));

  if (knowledge.length === 0) {
    return "";
  }

  // Group by category
  const grouped: Record<string, typeof knowledge> = {};
  for (const item of knowledge) {
    if (!grouped[item.category]) {
      grouped[item.category] = [];
    }
    grouped[item.category].push(item);
  }

  // Build context string with clear sections
  const sections: string[] = [];

  // Define category order and display names
  // These categories map to the settings page categories
  const categoryOrder = ["company", "products", "tone", "faq", "procedures", "custom"];
  const categoryNames: Record<string, string> = {
    company: "Company Information",
    products: "Products & Services",
    tone: "Communication Style Guidelines",
    faq: "FAQ & Common Responses",
    procedures: "Business Procedures",
    custom: "Additional Context",
  };

  for (const category of categoryOrder) {
    const items = grouped[category];
    if (!items || items.length === 0) continue;

    const categoryTitle = categoryNames[category] || category;
    const content = items.map((item) => `### ${item.title}\n${item.content}`).join("\n\n");
    sections.push(`## ${categoryTitle}\n\n${content}`);
  }

  return sections.join("\n\n");
}

/**
 * Get contact-specific context for personalized responses
 */
async function getContactContext(email: string): Promise<string> {
  const [contact] = await db
    .select()
    .from(contacts)
    .where(eq(contacts.email, email.toLowerCase()))
    .limit(1);

  if (!contact) {
    return "";
  }

  // Get any additional knowledge about this contact
  const knowledge = await db
    .select()
    .from(contactKnowledge)
    .where(eq(contactKnowledge.contactId, contact.id));

  const parts: string[] = [];

  if (contact.name) parts.push(`Name: ${contact.name}`);
  if (contact.company) parts.push(`Company: ${contact.company}`);
  if (contact.role) parts.push(`Role: ${contact.role}`);
  if (contact.communicationStyle) parts.push(`Preferred communication style: ${contact.communicationStyle}`);
  if (contact.language) parts.push(`Preferred language: ${contact.language === "de" ? "German" : "English"}`);
  if (contact.summary) parts.push(`Relationship context: ${contact.summary}`);

  // Add contact-specific knowledge
  if (knowledge.length > 0) {
    const knowledgeText = knowledge.map((k) => `- ${k.field}: ${k.value}`).join("\n");
    parts.push(`\nAdditional information about this contact:\n${knowledgeText}`);
  }

  if (parts.length === 0) {
    return "";
  }

  return `\n## About the Recipient\n${parts.join("\n")}`;
}

/**
 * Get thread history for context when replying
 */
async function getThreadContext(threadId: string): Promise<string> {
  const threadEmails = await db
    .select()
    .from(emails)
    .where(eq(emails.threadId, threadId))
    .orderBy(asc(emails.sentAt));

  if (threadEmails.length === 0) {
    return "";
  }

  // Format conversation history
  const history = threadEmails
    .map((email) => {
      const direction = email.direction === "inbound" ? "RECEIVED FROM CUSTOMER" : "SENT BY US";
      return `[${direction}] From: ${email.fromAddress}
Subject: ${email.subject || "(no subject)"}
Date: ${email.sentAt?.toISOString() || "Unknown"}

${email.bodyText?.substring(0, 1500) || "(no content)"}`;
    })
    .join("\n\n---\n\n");

  return `\n## Previous Conversation\n\n${history}`;
}

/**
 * Compose an email using AI with full knowledge base context
 * 
 * This is the main function that uses ALL settings from:
 * - /settings/knowledge (company info, products, tone, FAQ, procedures)
 * - Contact-specific information
 * - Thread history for replies
 */
export async function composeEmail(request: ComposeRequest): Promise<ComposeResponse> {
  const { threadId, instruction, additionalContext, senderName } = request;

  // Build context from knowledge base (uses ALL active knowledge items)
  const knowledgeContext = await buildKnowledgeContext();
  
  // Get AI settings to check if certain features are enabled
  const aiConfig = await getAISettings();
  
  // Get thread context if replying
  let threadContext = "";
  let recipientEmail = "";
  
  if (threadId) {
    threadContext = await getThreadContext(threadId);
    
    // Get recipient from last inbound email
    const lastInbound = await db
      .select()
      .from(emails)
      .where(and(eq(emails.threadId, threadId), eq(emails.direction, "inbound")))
      .orderBy(desc(emails.sentAt))
      .limit(1);
    
    if (lastInbound.length > 0) {
      recipientEmail = lastInbound[0].fromAddress;
    }
  }

  // Get contact-specific context for personalization
  const contactContext = recipientEmail ? await getContactContext(recipientEmail) : "";

  // Build the system prompt with ALL knowledge context
  // This is where the knowledge base settings directly influence the AI
  const systemPrompt = `Du bist ein AI E-Mail-Assistent für RechnungsAPI (rechnungs-api.de).

WICHTIG: Befolge die Richtlinien aus der Knowledge Base unten. Achte besonders auf:
- Kommunikationsstil (locker, "Du" Form, keine steifen Floskeln)
- Firmeninfos (korrekte Produktdetails, Preise)
- FAQ (Standard-Antworten auf häufige Fragen)
- Prozesse (wie verschiedene Anfragen behandelt werden)

${knowledgeContext}
${contactContext}
${threadContext}

SCHREIBREGELN (basierend auf Knowledge Base):
1. TON: Locker und freundlich, wie ein Gespräch unter Kollegen. Immer "Du", nie "Sie".
2. SPRACHE: 
   - Bei deutscher Konversation: Deutsch mit "Du"
   - Bei englischer Konversation: Englisch, casual but professional
   - Sprache immer an die vorherige Nachricht anpassen
3. STRUKTUR: Kurz und knackig (2-4 Absätze max). Keine Textwände.
4. ANREDE: "Hey [Name]," oder "Hi [Name]," - keine förmlichen Anreden
5. ABSCHLUSS: 
   - Deutsch: "Viele Grüße" oder "Beste Grüße" (NICHT "Mit freundlichen Grüßen")
   - Englisch: "Best," oder "Cheers,"
${senderName ? `6. SIGNATUR: Unterschreibe als "${senderName}"` : ""}
7. GENAUIGKEIT: Nur Produkte, Features und Preise nennen, die in der Knowledge Base stehen
8. PERSONALISIERUNG: Wenn Empfänger-Infos vorhanden sind, nutze sie für eine persönliche Antwort

${additionalContext ? `ZUSÄTZLICHER KONTEXT VOM USER:\n${additionalContext}` : ""}`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `${instruction}

Schreibe die E-Mail gemäß den Richtlinien im System-Prompt. Gib NUR den E-Mail-Text zurück (keine Betreffzeile, keine Metadaten, keine Erklärungen).`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response format");
  }

  // Generate subject line if this is a new email (no thread)
  let suggestedSubject: string | undefined;
  
  if (!threadId) {
    const subjectResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 100,
      messages: [
        {
          role: "user",
          content: `Based on this email, suggest a concise subject line (max 60 characters). Match the language of the email body:

${content.text}

Return ONLY the subject line, nothing else.`,
        },
      ],
    });

    const subjectContent = subjectResponse.content[0];
    if (subjectContent.type === "text") {
      suggestedSubject = subjectContent.text.trim();
    }
  }

  return {
    draft: content.text,
    suggestedSubject,
  };
}

/**
 * Improve an existing draft using knowledge base context
 */
export async function improveDraft(
  draft: string,
  instruction: string
): Promise<string> {
  // Get full knowledge context to ensure improvements follow guidelines
  const knowledgeContext = await buildKnowledgeContext();

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system: `Du bist ein AI E-Mail-Assistent für RechnungsAPI und hilfst beim Verbessern von E-Mail-Entwürfen.

Nutze diese Knowledge Base für unseren Kommunikationsstil:

${knowledgeContext}

VERBESSERUNGSREGELN:
1. Behalte die ursprüngliche Intention der E-Mail bei
2. Befolge unseren lockeren "Du"-Stil aus der Knowledge Base
3. Stelle sicher, dass Firmen-, Produkt- und Preisinfos korrekt sind
4. Behalte die Sprache (Deutsch/Englisch) des Originals bei
5. Verbessere Klarheit, Freundlichkeit und Prägnanz
6. Keine steifen Formulierungen - wir sind ein Startup!`,
    messages: [
      {
        role: "user",
        content: `Ursprünglicher Entwurf:
${draft}

Anweisung: ${instruction}

Gib NUR den verbesserten E-Mail-Text zurück, nichts anderes.`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response format");
  }

  return content.text;
}

/**
 * Check draft for potential issues based on knowledge base
 */
export async function checkDraft(draft: string): Promise<{
  issues: string[];
  suggestions: string[];
}> {
  const knowledgeContext = await buildKnowledgeContext();

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `Analysiere diesen E-Mail-Entwurf auf mögliche Probleme:

${draft}

Knowledge Base Kontext:
${knowledgeContext}

Prüfe auf:
1. Erwähnung von Anhängen ohne dass welche dabei sind
2. Ton-Probleme (zu förmlich? Wir nutzen "Du" und sind locker!)
3. Fehlende Anrede oder Grußformel
4. Unklare oder mehrdeutige Formulierungen
5. Mögliche Missverständnisse
6. Falsche Produkt-/Firmeninfos (vergleiche mit Knowledge Base)
7. Sprachkonsistenz (Deutsch/Englisch nicht mischen)

Gib ein JSON-Objekt zurück mit:
- issues: Array von gefundenen Problemen (leer wenn keine)
- suggestions: Array von Verbesserungsvorschlägen (leer wenn keine)

Gib NUR das JSON-Objekt zurück.`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    return { issues: [], suggestions: [] };
  }

  try {
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {
    // Ignore parse errors
  }

  return { issues: [], suggestions: [] };
}

/**
 * Generate a reply based on quick action type
 */
export async function generateQuickReply(
  emails: Email[],
  replyType: "positive" | "negative" | "question",
  senderName?: string
): Promise<string> {
  if (emails.length === 0) {
    throw new Error("No emails provided for reply generation");
  }

  const knowledgeContext = await buildKnowledgeContext();
  const lastEmail = emails[emails.length - 1];

  // Determine language from last email
  const isGerman = lastEmail.bodyText?.includes("Grüße") || 
                   lastEmail.bodyText?.includes("Hallo") ||
                   lastEmail.bodyText?.includes("Sehr geehrte") ||
                   lastEmail.subject?.includes("Anfrage") ||
                   lastEmail.subject?.includes("Frage");
  const emailLanguage = isGerman ? "German" : "English";

  const replyInstructions: Record<string, string> = {
    positive: emailLanguage === "German" 
      ? "Schreibe eine positive, zustimmende Antwort. Zeig Begeisterung und Hilfsbereitschaft. Locker und freundlich mit 'Du'."
      : "Write a positive, accepting response. Show enthusiasm and willingness to help. Casual and friendly.",
    negative: emailLanguage === "German"
      ? "Schreibe eine freundliche Absage oder Vertröstung. Respektvoll aber klar, dass es gerade nicht geht. Trotzdem locker bleiben."
      : "Write a polite decline or deferral. Respectful but clear. Stay casual and friendly despite saying no.",
    question: emailLanguage === "German"
      ? "Schreibe eine Rückfrage für mehr Details. Sei konkret, was du noch wissen musst. Locker und neugierig."
      : "Write a response asking for clarification. Be specific about what additional info would help. Stay curious and casual.",
  };

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: `Du bist ein AI E-Mail-Assistent für RechnungsAPI. Befolge diese Richtlinien:

${knowledgeContext}

Schreibe die Antwort auf ${emailLanguage === "German" ? "Deutsch mit 'Du'" : "English, casual style"}. 
Befolge unseren lockeren Startup-Kommunikationsstil.
${emailLanguage === "German" ? "Grußformel: 'Viele Grüße' oder 'Beste Grüße' (NICHT 'Mit freundlichen Grüßen')" : "Sign-off: 'Best,' or 'Cheers,'"}`,
    messages: [
      {
        role: "user",
        content: `Antworte auf diese E-Mail:

Von: ${lastEmail.fromAddress}
Betreff: ${lastEmail.subject}
Inhalt:
${lastEmail.bodyText?.substring(0, 1500)}

${replyInstructions[replyType]}

${senderName ? `Unterschreibe als ${senderName}.` : ""}

Gib NUR den E-Mail-Text zurück.`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response format");
  }

  return content.text;
}