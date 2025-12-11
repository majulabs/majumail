import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emails, threadLabels, labels, aiLabelRules, contacts } from "@/lib/db/schema";
import { parseInboundEmail } from "@/lib/utils/email-parser";
import { findOrCreateThread, updateThreadAfterNewEmail } from "@/lib/utils/threads";
import { classifyEmail, buildLabelRulesFromDb } from "@/lib/ai/classify";
import { verifyWebhookSignature, getEmailDetails } from "@/lib/resend/client";
import { extractEmailAddress } from "@/lib/utils/format";
import type { ResendInboundPayload } from "@/lib/types";
import { eq, sql } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    
    // Log incoming webhook for debugging
    console.log("=== WEBHOOK RECEIVED ===");
    console.log("Full payload:", body);
    
    // Get svix headers for verification
    const svixHeaders: Record<string, string> = {
      "svix-id": request.headers.get("svix-id") || "",
      "svix-timestamp": request.headers.get("svix-timestamp") || "",
      "svix-signature": request.headers.get("svix-signature") || "",
    };

    // Verify webhook signature
    const isValid = await verifyWebhookSignature(body, svixHeaders);
    if (!isValid) {
      console.error("Webhook signature verification failed");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload: ResendInboundPayload = JSON.parse(body);
    
    console.log("=== PARSED PAYLOAD ===");
    console.log("Type:", payload.type);
    console.log("Data keys:", Object.keys(payload.data || {}).join(", "));
    console.log("Has text:", !!payload.data?.text, "Length:", payload.data?.text?.length || 0);
    console.log("Has html:", !!payload.data?.html, "Length:", payload.data?.html?.length || 0);
    console.log("Email ID:", payload.data?.email_id);

    // Only handle email.received events
    if (payload.type !== "email.received") {
      return NextResponse.json({ received: true });
    }

    // For inbound emails, we MUST fetch the body from the Received Emails API
    // The webhook only contains metadata, not the actual body content
    let textContent: string | undefined;
    let htmlContent: string | undefined;
    
    if (payload.data.email_id) {
      console.log("Fetching email content from Received Emails API...");
      // Use isReceived=true for the /emails/receiving/:id endpoint
      const fullEmailContent = await getEmailDetails(payload.data.email_id, true);
      if (fullEmailContent) {
        textContent = fullEmailContent.text;
        htmlContent = fullEmailContent.html;
        console.log("API fetch result - text:", !!textContent, "length:", textContent?.length || 0);
        console.log("API fetch result - html:", !!htmlContent, "length:", htmlContent?.length || 0);
      } else {
        console.log("Failed to fetch email content from API");
      }
    } else {
      console.log("No email_id in payload, cannot fetch content");
    }

    // Merge full content into payload
    const enrichedPayload = {
      ...payload.data,
      text: textContent,
      html: htmlContent,
    };
    
    console.log("=== ENRICHED PAYLOAD ===");
    console.log("Final text length:", enrichedPayload.text?.length || 0);
    console.log("Final html length:", enrichedPayload.html?.length || 0);

    // Parse the email
    const parsed = parseInboundEmail(enrichedPayload);

    // Get all participants
    const participants = [
      parsed.fromAddress,
      ...parsed.toAddresses,
      ...(parsed.ccAddresses || []),
    ];

    // Find or create thread
    const threadId = await findOrCreateThread({
      messageId: parsed.messageId,
      inReplyTo: parsed.inReplyTo,
      references: parsed.references,
      subject: parsed.subject,
      participants,
    });

    // Insert the email
    const [newEmail] = await db
      .insert(emails)
      .values({
        threadId,
        messageId: parsed.messageId,
        inReplyTo: parsed.inReplyTo,
        referencesHeader: parsed.references,
        direction: "inbound",
        fromAddress: parsed.fromAddress,
        fromName: parsed.fromName,
        toAddresses: parsed.toAddresses,
        ccAddresses: parsed.ccAddresses,
        bccAddresses: parsed.bccAddresses,
        replyTo: parsed.replyTo,
        subject: parsed.subject,
        bodyText: parsed.bodyText,
        bodyHtml: parsed.bodyHtml,
        attachments: parsed.attachments,
        headers: parsed.headers,
        sentAt: new Date(),
      })
      .returning();

    // Update thread metadata
    await updateThreadAfterNewEmail(threadId, {
      bodyText: parsed.bodyText,
      sentAt: new Date(),
      fromAddress: parsed.fromAddress,
      toAddresses: parsed.toAddresses,
    });

    // Get Inbox label and apply it
    const [inboxLabel] = await db
      .select()
      .from(labels)
      .where(eq(labels.name, "Inbox"))
      .limit(1);

    if (inboxLabel) {
      await db
        .insert(threadLabels)
        .values({
          threadId,
          labelId: inboxLabel.id,
          appliedBy: "system",
        })
        .onConflictDoNothing();
    }

    // Run AI classification
    const rules = await db.query.aiLabelRules.findMany({
      where: eq(aiLabelRules.isActive, true),
      with: {
        label: true,
      },
    });

    const labelRules = buildLabelRulesFromDb(rules);

    if (labelRules.length > 0) {
      const classifications = await classifyEmail(
        {
          from: parsed.fromAddress,
          subject: parsed.subject || "",
          body: parsed.bodyText || "",
        },
        labelRules
      );

      // Apply labels with confidence >= 70
      for (const classification of classifications) {
        if (classification.confidence >= 70) {
          await db
            .insert(threadLabels)
            .values({
              threadId,
              labelId: classification.labelId,
              appliedBy: "ai",
              confidence: classification.confidence,
            })
            .onConflictDoNothing();
        }
      }
    }

    // Update or insert contact
    const contactEmail = extractEmailAddress(parsed.fromAddress);
    await db
      .insert(contacts)
      .values({
        email: contactEmail,
        name: parsed.fromName,
        lastContactedAt: new Date(),
        contactCount: 1,
      })
      .onConflictDoUpdate({
        target: contacts.email,
        set: {
          name: parsed.fromName || sql`${contacts.name}`,
          lastContactedAt: new Date(),
          contactCount: sql`${contacts.contactCount} + 1`,
        },
      });

    return NextResponse.json({
      received: true,
      threadId,
      emailId: newEmail.id,
    });
  } catch (error) {
    console.error("Webhook error:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack");
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
