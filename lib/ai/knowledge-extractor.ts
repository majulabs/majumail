import Anthropic from "@anthropic-ai/sdk";
import type { Email, Contact } from "../db/schema";
import type { KnowledgeExtraction } from "../types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ExtractKnowledgeParams {
  email: Email;
  existingContact?: Contact | null;
  direction: "inbound" | "outbound";
}

/**
 * Extract knowledge from an email that should be stored in the knowledge base
 */
export async function extractKnowledgeFromEmail(
  params: ExtractKnowledgeParams
): Promise<KnowledgeExtraction[]> {
  const { email, existingContact, direction } = params;

  const prompt = `You are an AI assistant helping to extract useful knowledge from emails for a business email client.

Analyze this ${direction} email and extract any information that would be useful to remember for future conversations.

## Email Details
From: ${email.fromAddress} ${email.fromName ? `(${email.fromName})` : ""}
To: ${email.toAddresses?.join(", ")}
Subject: ${email.subject || "(no subject)"}
Date: ${email.sentAt?.toISOString() || "Unknown"}

## Email Body
${email.bodyText?.substring(0, 3000) || "(no content)"}

## Existing Contact Info (if any)
${existingContact ? `
Name: ${existingContact.name || "Unknown"}
Company: ${existingContact.company || "Unknown"}
Role: ${existingContact.role || "Unknown"}
` : "No existing contact information"}

## Instructions
Extract any of the following if present and relevant:

1. **Contact Information Updates** (category: "contact")
   - New or updated company name
   - New or updated job title/role
   - Phone numbers mentioned
   - Preferences expressed (e.g., "please call me John", "I prefer email")

2. **Business Requirements** (category: "custom")
   - Specific needs or problems mentioned
   - Technical requirements
   - Budget or timeline mentioned

3. **Product Feedback** (category: "products")
   - Feature requests
   - Bug reports or issues
   - Positive feedback

4. **Process Information** (category: "procedures")
   - New processes or workflows discovered
   - Common questions that could be FAQ

Only extract information that is:
- Clearly stated (not implied)
- Useful for future reference
- Not already known (check existing contact info)

Respond with a JSON array of extractions. Each extraction should have:
- category: one of "contact", "products", "procedures", "faq", "custom"
- title: short descriptive title
- content: the extracted information
- confidence: 1-100 (how confident you are this is accurate and useful)
- field: (only for "contact" category) the field being updated like "company", "role", "preference"

Example response:
[
  {"category": "contact", "title": "Company Update", "content": "Works at TechCorp GmbH", "confidence": 95, "field": "company"},
  {"category": "custom", "title": "Integration Requirement", "content": "Needs SAP integration for invoice processing", "confidence": 85}
]

If nothing useful can be extracted, return an empty array: []

Respond with ONLY the JSON array, no other text.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      return [];
    }

    // Extract JSON from response
    const jsonMatch = content.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return [];
    }

    const extractions = JSON.parse(jsonMatch[0]) as KnowledgeExtraction[];
    return extractions.filter((e) => e.confidence >= 50);
  } catch (error) {
    console.error("Knowledge extraction error:", error);
    return [];
  }
}

/**
 * Generate a summary of an email thread
 */
export async function generateThreadSummary(
  emails: Email[]
): Promise<{
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  sentiment: "positive" | "negative" | "neutral";
} | null> {
  if (emails.length === 0) return null;

  const conversationHistory = emails
    .map((e) => `[${e.direction === "inbound" ? "RECEIVED" : "SENT"}] From: ${e.fromAddress}
Date: ${e.sentAt?.toISOString() || "Unknown"}
${e.bodyText?.substring(0, 1000) || "(no content)"}`)
    .join("\n\n---\n\n");

  const prompt = `Analyze this email thread and provide a structured summary.

## Email Thread
${conversationHistory}

## Instructions
Provide a JSON response with:
1. summary: A 2-3 sentence overview of the conversation
2. keyPoints: Array of key points discussed (max 5)
3. actionItems: Array of action items or next steps identified (max 5)
4. sentiment: Overall sentiment - "positive", "negative", or "neutral"

Respond with ONLY the JSON object, no other text.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      return null;
    }

    // Extract JSON from response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return null;
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("Thread summary error:", error);
    return null;
  }
}

/**
 * Generate smart reply suggestions for an email
 */
export async function generateSmartReplies(
  emails: Email[],
  contextKnowledge: string
): Promise<{
  id: string;
  text: string;
  type: "positive" | "negative" | "neutral" | "question";
  preview: string;
}[]> {
  if (emails.length === 0) return [];

  const lastEmail = emails[emails.length - 1];
  
  // Only generate for inbound emails
  if (lastEmail.direction !== "inbound") return [];

  const conversationHistory = emails
    .slice(-3) // Last 3 emails for context
    .map((e) => `[${e.direction === "inbound" ? "RECEIVED" : "SENT"}] From: ${e.fromAddress}
${e.bodyText?.substring(0, 500) || "(no content)"}`)
    .join("\n\n---\n\n");

  const prompt = `Generate 3 smart reply suggestions for this email conversation.

## Context
${contextKnowledge}

## Recent Conversation
${conversationHistory}

## Instructions
Generate exactly 3 different reply suggestions:
1. A positive/accepting response
2. A polite decline or deferral
3. A clarifying question or request for more info

For each suggestion, provide:
- id: unique identifier (reply_1, reply_2, reply_3)
- text: short button label (2-4 words)
- type: "positive", "negative", "neutral", or "question"
- preview: The first sentence of what the reply would say

Respond with ONLY a JSON array, no other text.

Example:
[
  {"id": "reply_1", "text": "Sounds great", "type": "positive", "preview": "Thank you for reaching out! I'd be happy to discuss this further."},
  {"id": "reply_2", "text": "Not right now", "type": "negative", "preview": "Thank you for your interest, but we're not able to take this on at the moment."},
  {"id": "reply_3", "text": "Tell me more", "type": "question", "preview": "Could you provide more details about your specific requirements?"}
]`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      return [];
    }

    // Extract JSON from response
    const jsonMatch = content.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return [];
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("Smart replies error:", error);
    return [];
  }
}

/**
 * Enrich contact information using AI
 */
export async function enrichContactFromEmails(
  contact: Contact,
  recentEmails: Email[]
): Promise<{
  updates: Partial<Contact>;
  knowledge: { field: string; value: string; confidence: number }[];
}> {
  const emailSummaries = recentEmails
    .slice(0, 10) // Last 10 emails
    .map((e) => `[${e.direction}] Subject: ${e.subject}
${e.bodyText?.substring(0, 300) || ""}`)
    .join("\n\n");

  const prompt = `Analyze these emails to extract information about a contact.

## Contact
Email: ${contact.email}
Name: ${contact.name || "Unknown"}
Company: ${contact.company || "Unknown"}
Role: ${contact.role || "Unknown"}

## Recent Emails
${emailSummaries}

## Instructions
Based on the emails, extract:
1. Any updates to basic contact info (name, company, role)
2. Their communication style (formal, casual, technical)
3. Their preferred language
4. A brief summary of your relationship
5. Their main interests or topics discussed
6. Any additional knowledge worth remembering

Respond with ONLY a JSON object:
{
  "updates": {
    "name": "if new name discovered",
    "company": "if company mentioned",
    "role": "if role mentioned",
    "communicationStyle": "formal|casual|technical",
    "language": "de|en",
    "summary": "Brief relationship summary"
  },
  "knowledge": [
    {"field": "interest", "value": "Topic they're interested in", "confidence": 85},
    {"field": "preference", "value": "Communication preference", "confidence": 90}
  ]
}

Only include fields where you found clear evidence. Set confidence based on how certain you are.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      return { updates: {}, knowledge: [] };
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { updates: {}, knowledge: [] };
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("Contact enrichment error:", error);
    return { updates: {}, knowledge: [] };
  }
}
