import Anthropic from "@anthropic-ai/sdk";
import type { ClassificationResult } from "../types";
import type { AILabelRule } from "../db/schema";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface LabelRule {
  labelId: string;
  labelName: string;
  description: string;
  examples?: string[] | null;
  keywords?: string[] | null;
  senderPatterns?: string[] | null;
}

interface ClassifyEmailParams {
  from: string;
  subject: string;
  body: string;
}

export async function classifyEmail(
  email: ClassifyEmailParams,
  rules: LabelRule[]
): Promise<ClassificationResult[]> {
  if (rules.length === 0) {
    return [];
  }

  const rulesText = rules
    .map(
      (r) => `
- **${r.labelName}** (ID: ${r.labelId})
  Description: ${r.description}
  ${r.examples?.length ? `Examples: ${r.examples.join(", ")}` : ""}
  ${r.keywords?.length ? `Keywords: ${r.keywords.join(", ")}` : ""}
  ${r.senderPatterns?.length ? `Sender patterns: ${r.senderPatterns.join(", ")}` : ""}`
    )
    .join("\n");

  const prompt = `You are an email classifier for RechnungsAPI, a German e-invoicing API service.

Analyze the email below and determine which labels should be applied.

## Available Labels
${rulesText}

## Email to Classify
From: ${email.from}
Subject: ${email.subject}
Body (preview): ${email.body.substring(0, 500)}

## Instructions
1. Consider the sender, subject, and body content
2. Match against label descriptions, examples, and keywords
3. A single email can have multiple labels
4. Only suggest labels where you have reasonable confidence (>50%)

Respond with ONLY a JSON array of applicable labels:
[
  {"labelId": "uuid-here", "labelName": "Label Name", "confidence": 85, "reason": "brief reason"}
]

Return an empty array [] if no labels apply with confidence.`;

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

    const results = JSON.parse(jsonMatch[0]) as ClassificationResult[];
    return results.filter((r) => r.confidence >= 50);
  } catch (error) {
    console.error("Classification error:", error);
    return [];
  }
}

export function buildLabelRulesFromDb(
  rules: (AILabelRule & { label: { id: string; name: string } | null })[]
): LabelRule[] {
  return rules
    .filter((r) => r.isActive && r.label)
    .map((r) => ({
      labelId: r.label!.id,
      labelName: r.label!.name,
      description: r.description,
      examples: r.examples,
      keywords: r.keywords,
      senderPatterns: r.senderPatterns,
    }));
}
