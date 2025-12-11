import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { emails, threads, threadLabels, contacts, mailboxes, labels } from "@/lib/db/schema";
import { sendEmail } from "@/lib/resend/client";
import { extractEmailAddress } from "@/lib/utils/format";
import { eq, sql } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { from, to, cc, bcc, subject, body: emailBody, bodyHtml, replyToThreadId, inReplyTo, references } = body;

    // Validate from address is in mailboxes
    const [mailbox] = await db
      .select()
      .from(mailboxes)
      .where(eq(mailboxes.address, from))
      .limit(1);

    if (!mailbox) {
      return NextResponse.json(
        { error: "Invalid sender address" },
        { status: 400 }
      );
    }

    // Build email headers for threading
    const headers: Record<string, string> = {};
    if (inReplyTo) {
      headers["In-Reply-To"] = inReplyTo;
    }
    if (references?.length) {
      headers["References"] = references.join(" ");
    }

    // Send via Resend
    const fromWithName = mailbox.displayName
      ? `${mailbox.displayName} <${from}>`
      : from;

    const result = await sendEmail({
      from: fromWithName,
      to,
      cc,
      bcc,
      subject,
      text: emailBody,
      html: bodyHtml,
      headers,
    });

    // Determine thread
    let threadId = replyToThreadId;

    if (!threadId) {
      // Create new thread for new conversation
      const participants = [from, ...to, ...(cc || [])].map(extractEmailAddress);

      const [newThread] = await db
        .insert(threads)
        .values({
          subject,
          snippet: emailBody.substring(0, 150),
          participantAddresses: participants,
          lastMessageAt: new Date(),
          isRead: true,
        })
        .returning();

      threadId = newThread.id;
    } else {
      // Update existing thread
      const participants = [from, ...to, ...(cc || [])].map(extractEmailAddress);
      
      await db
        .update(threads)
        .set({
          snippet: emailBody.substring(0, 150),
          lastMessageAt: new Date(),
          updatedAt: new Date(),
          participantAddresses: sql`array_cat(${threads.participantAddresses}, ${participants}::text[])`,
        })
        .where(eq(threads.id, threadId));
    }

    // Store the sent email
    const [newEmail] = await db
      .insert(emails)
      .values({
        threadId,
        resendId: result.id,
        direction: "outbound",
        fromAddress: from,
        fromName: mailbox.displayName,
        toAddresses: to,
        ccAddresses: cc || [],
        bccAddresses: bcc || [],
        subject,
        bodyText: emailBody,
        bodyHtml,
        inReplyTo,
        referencesHeader: references,
        sentAt: new Date(),
      })
      .returning();

    // Apply "Sent" label
    const [sentLabel] = await db
      .select()
      .from(labels)
      .where(eq(labels.name, "Sent"))
      .limit(1);

    if (sentLabel) {
      await db
        .insert(threadLabels)
        .values({
          threadId,
          labelId: sentLabel.id,
          appliedBy: "system",
        })
        .onConflictDoNothing();
    }

    // Update contacts
    const allRecipients = [...to, ...(cc || []), ...(bcc || [])];
    for (const recipient of allRecipients) {
      const email = extractEmailAddress(recipient);
      await db
        .insert(contacts)
        .values({
          email,
          lastContactedAt: new Date(),
          contactCount: 1,
        })
        .onConflictDoUpdate({
          target: contacts.email,
          set: {
            lastContactedAt: new Date(),
            contactCount: sql`${contacts.contactCount} + 1`,
          },
        });
    }

    return NextResponse.json({
      success: true,
      emailId: newEmail.id,
      threadId,
      resendId: result.id,
    });
  } catch (error) {
    console.error("Send email error:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
