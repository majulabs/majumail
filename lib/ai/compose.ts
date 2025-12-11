import Anthropic from "@anthropic-ai/sdk";
import type { AIContext, Email } from "../db/schema";
import type { ComposeResponse } from "../types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ComposeParams {
  instruction: string;
  threadHistory?: Email[];
  context: AIContext[];
  senderName?: string;
}

export async function generateDraft(
  params: ComposeParams
): Promise<ComposeResponse> {
  const { instruction, threadHistory, context, senderName } = params;

  const contextText = context
    .filter((c) => c.isActive)
    .map((c) => `### ${c.title}\n${c.content}`)
    .join("\n\n");

  const systemPrompt = `You are an email assistant for the RechnungsAPI team.

## Company Context
${contextText}

## Writing Guidelines
1. Write in German unless the conversation is clearly in English
2. Be professional but friendly - we're a small startup (Marcel and Julien)
3. Keep emails concise and focused
4. Only output the email body - no metadata
5. End with appropriate sign-off (Beste Grüße, Best regards, etc.)
${senderName ? `6. Sign as ${senderName}` : ""}

Do not include:
- Email headers or metadata
- Placeholder text like [Name] or [Company]
- Explanations about your response`;

  let userPrompt = "";

  if (threadHistory?.length) {
    userPrompt += "## Conversation History\n\n";
    for (const email of threadHistory) {
      userPrompt += `[${email.direction === "inbound" ? "RECEIVED" : "SENT"}]\n`;
      userPrompt += `From: ${email.fromAddress}\n`;
      userPrompt += `Date: ${email.sentAt?.toISOString() || "Unknown"}\n`;
      userPrompt += `${email.bodyText || "(no text content)"}\n\n---\n\n`;
    }
  }

  userPrompt += `## Your Task\n${instruction}`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type");
    }

    // Check if we need to suggest a subject
    let suggestedSubject: string | undefined;
    if (!threadHistory?.length) {
      // For new emails, try to generate a subject
      const subjectResponse = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 100,
        messages: [
          {
            role: "user",
            content: `Based on this email body, suggest a concise subject line in the same language:\n\n${content.text}\n\nRespond with only the subject line, no quotes or explanation.`,
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
  } catch (error) {
    console.error("Compose error:", error);
    throw error;
  }
}
