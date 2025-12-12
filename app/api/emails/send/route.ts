import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { emails, threads, threadLabels, contacts, mailboxes, labels, attachments } from "@/lib/db/schema";
import { sendEmail } from "@/lib/resend/client";
import { extractEmailAddress } from "@/lib/utils/format";
import { generateEmailHtml, type EmailTemplateType } from "@/lib/email/template";
import { eq, sql, inArray } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { 
      from, 
      to, 
      cc, 
      bcc, 
      subject, 
      body: emailBody, 
      bodyHtml, // Allow direct HTML override
      templateType = "branded" as EmailTemplateType, // NEW: template selection
      replyToThreadId, 
      inReplyTo, 
      references,
      attachmentIds,
    } = body;

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

    // Fetch attachments if any
    let emailAttachments: Array<{
      id: string;
      filename: string;
      contentType: string;
      storageUrl: string | null;
    }> = [];

    if (attachmentIds?.length > 0) {
      console.log("[Send] Fetching attachments:", attachmentIds);
      emailAttachments = await db
        .select({
          id: attachments.id,
          filename: attachments.filename,
          contentType: attachments.contentType,
          storageUrl: attachments.storageUrl,
        })
        .from(attachments)
        .where(inArray(attachments.id, attachmentIds));
      console.log("[Send] Found attachments:", emailAttachments.map(a => ({ filename: a.filename, hasUrl: !!a.storageUrl })));
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

    // Generate HTML email using template system
    // Priority: 1) Direct bodyHtml override, 2) Generated from template, 3) None
    let finalHtml: string | undefined = bodyHtml;
    
    if (!finalHtml && templateType !== "none") {
      // Generate HTML from template
      finalHtml = generateEmailHtml(emailBody, templateType, {
        senderName: mailbox.displayName || undefined,
        // For replies, don't include heavy footer
        includeFooter: templateType === "branded" && !replyToThreadId,
      });
      
      console.log(`[Send] Generated ${templateType} HTML template`);
    }

    // Build Resend attachments array
    const resendAttachments = await Promise.all(
      emailAttachments
        .filter((a) => a.storageUrl)
        .map(async (a) => {
          try {
            console.log(`[Send] Fetching attachment from storage: ${a.filename} - ${a.storageUrl}`);
            const response = await fetch(a.storageUrl!);
            if (!response.ok) {
              console.error(`[Send] Failed to fetch ${a.filename}: ${response.status}`);
              return null;
            }
            const buffer = await response.arrayBuffer();
            console.log(`[Send] Fetched ${a.filename}: ${buffer.byteLength} bytes`);
            return {
              filename: a.filename,
              content: Buffer.from(buffer),
              contentType: a.contentType,
            };
          } catch (error) {
            console.error(`[Send] Failed to fetch attachment ${a.filename}:`, error);
            return null;
          }
        })
    );

    const validAttachments = resendAttachments.filter((a) => a !== null);
    console.log(`[Send] Valid attachments to send: ${validAttachments.length}`);

    const result = await sendEmail({
      from: fromWithName,
      to,
      cc,
      bcc,
      subject,
      text: emailBody,
      html: finalHtml,
      headers,
      attachments: validAttachments.length > 0 ? validAttachments : undefined,
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
        bodyHtml: finalHtml, // Store the generated HTML
        inReplyTo,
        referencesHeader: references,
        sentAt: new Date(),
      })
      .returning();

    // Link attachments to the email
    if (attachmentIds?.length > 0) {
      await db
        .update(attachments)
        .set({ emailId: newEmail.id })
        .where(inArray(attachments.id, attachmentIds));
    }

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
          firstContactedAt: new Date(),
          emailCount: 1,
          outboundCount: 1,
        })
        .onConflictDoUpdate({
          target: contacts.email,
          set: {
            lastContactedAt: new Date(),
            emailCount: sql`${contacts.emailCount} + 1`,
            outboundCount: sql`${contacts.outboundCount} + 1`,
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
