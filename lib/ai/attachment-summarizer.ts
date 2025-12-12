import Anthropic from "@anthropic-ai/sdk";
import type { AttachmentSummary } from "../types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Maximum text to send to AI for summarization
const MAX_TEXT_FOR_SUMMARY = 4000;

/**
 * Check if a content type is text-based
 */
export function isTextBased(contentType: string): boolean {
  const textTypes = [
    "text/plain",
    "text/html",
    "text/csv",
    "text/markdown",
    "application/json",
    "application/xml",
    "text/xml",
  ];
  return textTypes.some((t) => contentType.toLowerCase().includes(t));
}

/**
 * Check if a content type is an image
 */
export function isImage(contentType: string): boolean {
  return contentType.toLowerCase().startsWith("image/");
}

/**
 * Check if a content type is a PDF
 */
export function isPdf(contentType: string): boolean {
  return contentType.toLowerCase() === "application/pdf";
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Truncate text smartly - keep beginning and end
 */
function truncateSmartly(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  
  const halfLength = Math.floor(maxLength / 2) - 50;
  const beginning = text.substring(0, halfLength);
  const ending = text.substring(text.length - halfLength);
  
  return `${beginning}\n\n[... content truncated ...]\n\n${ending}`;
}

/**
 * Summarize a text-based attachment
 */
async function summarizeTextAttachment(
  filename: string,
  text: string
): Promise<string> {
  const truncatedText = truncateSmartly(text, MAX_TEXT_FOR_SUMMARY);
  
  const prompt = `Summarize this document attachment in 2-3 sentences. Focus on the main purpose and key information.

Filename: ${filename}

Content:
${truncatedText}

Provide a concise summary that captures what this document is about and any important details.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 256,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type === "text") {
      return content.text;
    }
    return `Text document: ${filename}`;
  } catch (error) {
    console.error("Text summarization error:", error);
    return `Text document: ${filename}`;
  }
}

/**
 * Summarize a PDF attachment by extracting and analyzing text
 * Note: This is a simplified version - in production you'd want to use pdf-parse
 */
async function summarizePdfAttachment(
  filename: string,
  base64Content: string
): Promise<{ summary: string; extractedText?: string }> {
  // For now, use Claude's vision capability with the PDF
  // In production, you might want to use pdf-parse for text extraction first
  
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64Content,
              },
            },
            {
              type: "text",
              text: `Summarize this PDF document "${filename}" in 2-3 sentences. Focus on:
1. What type of document is this (invoice, contract, report, etc.)
2. Key information or numbers mentioned
3. Any important dates or deadlines

Keep the summary brief and factual.`,
            },
          ],
        },
      ],
    });

    const content = response.content[0];
    if (content.type === "text") {
      return { summary: content.text };
    }
    return { summary: `PDF document: ${filename}` };
  } catch (error) {
    console.error("PDF summarization error:", error);
    return { summary: `PDF document: ${filename}` };
  }
}

/**
 * Describe an image attachment
 */
async function describeImageAttachment(
  filename: string,
  base64Content: string,
  contentType: string
): Promise<string> {
  try {
    // Map content type to Claude's expected format
    const mediaType = contentType.toLowerCase() as "image/jpeg" | "image/png" | "image/gif" | "image/webp";
    
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 256,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64Content,
              },
            },
            {
              type: "text",
              text: `Briefly describe this image attachment "${filename}" in 1-2 sentences. What does it show?`,
            },
          ],
        },
      ],
    });

    const content = response.content[0];
    if (content.type === "text") {
      return content.text;
    }
    return `Image: ${filename}`;
  } catch (error) {
    console.error("Image description error:", error);
    return `Image: ${filename}`;
  }
}

/**
 * Main function to summarize any attachment
 */
export async function summarizeAttachment(attachment: {
  filename: string;
  contentType: string;
  content: string; // Base64 encoded
  size: number;
}): Promise<AttachmentSummary> {
  const { filename, contentType, content, size } = attachment;
  
  // Skip very large files to avoid token waste
  const MAX_SIZE_FOR_SUMMARY = 5 * 1024 * 1024; // 5MB
  if (size > MAX_SIZE_FOR_SUMMARY) {
    return {
      filename,
      contentType,
      size,
      summary: `Large file (${formatFileSize(size)}): ${filename}. Content not summarized due to size.`,
    };
  }

  try {
    // Handle text-based files
    if (isTextBased(contentType)) {
      const text = Buffer.from(content, "base64").toString("utf-8");
      const summary = await summarizeTextAttachment(filename, text);
      return {
        filename,
        contentType,
        size,
        summary,
        extractedText: text.substring(0, 10000), // Store first 10k chars for search
      };
    }

    // Handle PDFs
    if (isPdf(contentType)) {
      const { summary, extractedText } = await summarizePdfAttachment(filename, content);
      return {
        filename,
        contentType,
        size,
        summary,
        extractedText,
      };
    }

    // Handle images
    if (isImage(contentType)) {
      const summary = await describeImageAttachment(filename, content, contentType);
      return {
        filename,
        contentType,
        size,
        summary,
      };
    }

    // For other file types, just return metadata
    return {
      filename,
      contentType,
      size,
      summary: `File attachment: ${filename} (${formatFileSize(size)}, ${contentType})`,
    };
  } catch (error) {
    console.error("Attachment summarization error:", error);
    return {
      filename,
      contentType,
      size,
      summary: `Attachment: ${filename} (${formatFileSize(size)})`,
    };
  }
}

/**
 * Extract knowledge from an attachment summary
 */
export async function extractKnowledgeFromAttachment(
  summary: AttachmentSummary,
  emailContext: { from: string; subject: string }
): Promise<{
  category: string;
  title: string;
  content: string;
  confidence: number;
} | null> {
  // Only try to extract knowledge from meaningful summaries
  if (summary.summary.length < 50) return null;
  
  const prompt = `Based on this attachment summary, determine if there's any business knowledge worth storing.

Attachment: ${summary.filename}
Type: ${summary.contentType}
Summary: ${summary.summary}
Email from: ${emailContext.from}
Email subject: ${emailContext.subject}

If this attachment contains important business information (like an invoice, contract, specification, etc.), extract the key knowledge.

Respond with ONLY a JSON object if relevant, or "null" if not worth storing:
{
  "category": "products|procedures|custom",
  "title": "Brief title",
  "content": "Key information to remember",
  "confidence": 70-100
}`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 256,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") return null;
    
    if (content.text.trim().toLowerCase() === "null") return null;
    
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("Attachment knowledge extraction error:", error);
    return null;
  }
}
