import { db } from "../db";
import { emails, threads } from "../db/schema";
import { eq, inArray, ilike, desc } from "drizzle-orm";
import { normalizeSubject } from "./email-parser";
import { extractEmailAddress } from "./format";

interface ThreadMatchParams {
  messageId?: string;
  inReplyTo?: string;
  references?: string[];
  subject: string | null;
  participants: string[];
}

export async function findOrCreateThread(
  params: ThreadMatchParams
): Promise<string> {
  const { inReplyTo, references, subject, participants } = params;

  // 1. Try In-Reply-To header
  if (inReplyTo) {
    const existing = await db
      .select({ threadId: emails.threadId })
      .from(emails)
      .where(eq(emails.messageId, inReplyTo))
      .limit(1);

    if (existing[0]?.threadId) {
      return existing[0].threadId;
    }
  }

  // 2. Try References header
  if (references?.length) {
    const existing = await db
      .select({ threadId: emails.threadId })
      .from(emails)
      .where(inArray(emails.messageId, references))
      .limit(1);

    if (existing[0]?.threadId) {
      return existing[0].threadId;
    }
  }

  // 3. Try subject + participant matching
  const normalizedSubject = normalizeSubject(subject);
  const normalizedParticipants = participants.map((p) =>
    extractEmailAddress(p)
  );

  if (normalizedSubject) {
    const candidates = await db
      .select()
      .from(threads)
      .where(ilike(threads.subject, `%${normalizedSubject}%`))
      .orderBy(desc(threads.lastMessageAt))
      .limit(10);

    for (const thread of candidates) {
      const threadParticipants = thread.participantAddresses || [];
      const overlap = threadParticipants.filter((addr) =>
        normalizedParticipants.includes(addr.toLowerCase())
      );
      if (overlap.length >= 1) {
        return thread.id;
      }
    }
  }

  // 4. Create new thread
  const [newThread] = await db
    .insert(threads)
    .values({
      subject: subject,
      snippet: "",
      participantAddresses: normalizedParticipants,
      lastMessageAt: new Date(),
    })
    .returning({ id: threads.id });

  return newThread.id;
}

export async function updateThreadAfterNewEmail(
  threadId: string,
  email: {
    bodyText?: string | null;
    sentAt?: Date | null;
    fromAddress: string;
    toAddresses: string[];
  }
): Promise<void> {
  // Get current thread
  const [thread] = await db
    .select()
    .from(threads)
    .where(eq(threads.id, threadId))
    .limit(1);

  if (!thread) return;

  // Update participants
  const currentParticipants = new Set(thread.participantAddresses || []);
  const newParticipants = [email.fromAddress, ...email.toAddresses].map((p) =>
    extractEmailAddress(p)
  );
  newParticipants.forEach((p) => currentParticipants.add(p));

  // Update snippet
  const snippet = email.bodyText
    ? email.bodyText.substring(0, 150).replace(/\s+/g, " ").trim()
    : "";

  await db
    .update(threads)
    .set({
      snippet,
      participantAddresses: Array.from(currentParticipants),
      lastMessageAt: email.sentAt || new Date(),
      isRead: false,
      updatedAt: new Date(),
    })
    .where(eq(threads.id, threadId));
}
