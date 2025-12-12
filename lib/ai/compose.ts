import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { aiKnowledge, contacts, contactKnowledge, emails } from "@/lib/db/schema";
import { eq, and, asc, desc, or, sql } from "drizzle-orm";
import type { ComposeRequest, ComposeResponse } from "@/lib/types";
import type { Email } from "@/lib/db/schema";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Build context from knowledge base
 */
async function buildKnowledgeContext(): Promise<string> {
  const knowledge = await db
    .select()
    .from(aiKnowledge)
    .where(eq(aiKnowledge.isActive, true))
    .orderBy(asc(aiKnowledge.sortOrder));

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

  // Build context string
  const sections: string[] = [];

  const categoryOrder = ["company", "products", "tone", "faq", "procedures", "custom"];
  const categoryNames: Record<string, string> = {
    company: "Company Information",
    products: "Products & Services",
    tone: "Communication Style",
    faq: "FAQ & Templates",
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
 * Get contact-specific context
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

  const knowledge = await db
    .select()
    .from(contactKnowledge)
    .where(eq(contactKnowledge.contactId, contact.id));

  const parts: string[] = [];

  if (contact.name) parts.push(`Name: ${contact.name}`);
  if (contact.company) parts.push(`Company: ${contact.company}`);
  if (contact.role) parts.push(`Role: ${contact.role}`);
  if (contact.communicationStyle) parts.push(`Preferred style: ${contact.communicationStyle}`);
  if (contact.language) parts.push(`Language: ${contact.language === "de" ? "German" : "English"}`);
  if (contact.summary) parts.push(`Relationship: ${contact.summary}`);

  if (knowledge.length > 0) {
    const knowledgeText = knowledge.map((k) => `- ${k.field}: ${k.value}`).join("\n");
    parts.push(`\nAdditional info:\n${knowledgeText}`);
  }

  if (parts.length === 0) {
    return "";
  }

  return `\n## About the Recipient\n${parts.join("\n")}`;
}

/**
 * Get thread history for context
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

  const history = threadEmails
    .map((email) => {
      const direction = email.direction === "inbound" ? "RECEIVED" : "SENT";
      return `[${direction}] From: ${email.fromAddress}
Subject: ${email.subject || "(no subject)"}
Date: ${email.sentAt?.toISOString() || "Unknown"}

${email.bodyText?.substring(0, 1500) || "(no content)"}`;
    })
    .join("\n\n---\n\n");

  return `\n## Previous Conversation\n\n${history}`;
}

/**
 * Compose an email using AI with knowledge base context
 */
export async function composeEmail(request: ComposeRequest): Promise<ComposeResponse> {
  const { threadId, instruction, additionalContext, senderName } = request;

  // Build context from various sources
  const knowledgeContext = await buildKnowledgeContext();
  
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

  // Get contact-specific context
  const contactContext = recipientEmail ? await getContactContext(recipientEmail) : "";

  const systemPrompt = `You are an AI email assistant helping to compose professional emails. 
Use the following knowledge base to inform your writing style, company information, and responses.

${knowledgeContext}
${contactContext}
${threadContext}

Guidelines:
- Write in a professional but friendly tone unless the knowledge base specifies otherwise
- Match the language of the previous conversation (German or English)
- Be concise and clear
- Use appropriate greetings and sign-offs
- If this is a reply, address the points raised in the previous email
${senderName ? `- Sign emails as "${senderName}"` : ""}

${additionalContext ? `Additional context from user:\n${additionalContext}` : ""}`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `${instruction}

Please compose the email. Return ONLY the email body text, no subject line or metadata.`,
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
          content: `Based on this email, suggest a concise subject line (max 60 characters):

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
 * Improve an existing draft
 */
export async function improveDraft(
  draft: string,
  instruction: string
): Promise<string> {
  const knowledgeContext = await buildKnowledgeContext();

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system: `You are an AI email assistant helping to improve email drafts.
Use the following knowledge base for context:

${knowledgeContext}

Your task is to improve the draft according to the user's instruction while maintaining the original intent.`,
    messages: [
      {
        role: "user",
        content: `Original draft:
${draft}

Instruction: ${instruction}

Return ONLY the improved email text, nothing else.`,
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
 * Check draft for potential issues
 */
export async function checkDraft(draft: string): Promise<{
  issues: string[];
  suggestions: string[];
}> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `Analyze this email draft for potential issues:

${draft}

Check for:
1. Mentions of attachments without actual attachments
2. Tone issues (too formal/informal)
3. Missing greeting or sign-off
4. Unclear or ambiguous language
5. Potential misunderstandings

Return a JSON object with:
- issues: array of problems found
- suggestions: array of improvement suggestions

If no issues, return empty arrays.`,
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
