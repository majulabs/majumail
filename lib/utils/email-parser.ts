import type { ResendInboundPayload } from "../types";

export function parseInboundEmail(payload: ResendInboundPayload["data"]) {
  // Headers may not be present in all webhook payloads
  const headers = new Map(
    (payload.headers || []).map((h) => [h.name.toLowerCase(), h.value])
  );

  // Get message ID from headers or directly from payload
  const messageId = payload.message_id || headers.get("message-id") || undefined;
  const inReplyTo = headers.get("in-reply-to") || undefined;
  const referencesRaw = headers.get("references") || "";
  const references = referencesRaw
    ? referencesRaw.split(/\s+/).filter(Boolean)
    : [];

  // Parse from address
  const fromMatch = payload.from.match(/^(.+?)\s*<(.+)>$/);
  const fromName = fromMatch ? fromMatch[1].trim() : undefined;
  const fromAddress = fromMatch ? fromMatch[2] : payload.from;

  return {
    messageId,
    inReplyTo,
    references,
    fromAddress,
    fromName,
    toAddresses: payload.to,
    ccAddresses: payload.cc || [],
    bccAddresses: payload.bcc || [],
    replyTo: payload.reply_to,
    subject: payload.subject,
    bodyText: payload.text || "(No content available)",
    bodyHtml: payload.html || undefined,
    attachments: payload.attachments || [],
    headers: Object.fromEntries(headers),
  };
}

export function normalizeSubject(subject: string | null): string {
  if (!subject) return "";
  // Remove Re:, Fwd:, AW:, WG:, FW: prefixes (German and English)
  return subject
    .replace(/^(re|fwd|aw|wg|fw):\s*/gi, "")
    .replace(/^(re|fwd|aw|wg|fw):\s*/gi, "")
    .trim();
}

export function getHeader(
  headers: Array<{ name: string; value: string }>,
  name: string
): string | undefined {
  return headers.find(
    (h) => h.name.toLowerCase() === name.toLowerCase()
  )?.value;
}

export function sanitizeHtml(html: string): string {
  // Basic HTML sanitization - remove scripts, iframes, etc.
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "")
    .replace(/<embed\b[^>]*>/gi, "")
    .replace(/<link\b[^>]*>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "")
    .replace(/on\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}
