import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { threads, emails, threadLabels, labels, attachments } from "@/lib/db/schema";
import { eq, asc, inArray } from "drizzle-orm";
import { broadcastSSE } from "@/app/api/sse/route";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Get thread
    const [thread] = await db
      .select()
      .from(threads)
      .where(eq(threads.id, id))
      .limit(1);

    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    // Get emails
    const threadEmails = await db
      .select()
      .from(emails)
      .where(eq(emails.threadId, id))
      .orderBy(asc(emails.sentAt));

    // Get attachments for all emails in this thread
    const emailIds = threadEmails.map((e) => e.id);
    let emailAttachments: Array<{
      id: string;
      emailId: string | null;
      filename: string;
      contentType: string;
      size: number;
      storageUrl: string | null;
      summary: string | null;
    }> = [];

    if (emailIds.length > 0) {
      emailAttachments = await db
        .select({
          id: attachments.id,
          emailId: attachments.emailId,
          filename: attachments.filename,
          contentType: attachments.contentType,
          size: attachments.size,
          storageUrl: attachments.storageUrl,
          summary: attachments.summary,
        })
        .from(attachments)
        .where(inArray(attachments.emailId, emailIds));
    }

    // Group attachments by email ID
    const attachmentsByEmailId = emailAttachments.reduce(
      (acc, att) => {
        if (att.emailId) {
          if (!acc[att.emailId]) {
            acc[att.emailId] = [];
          }
          acc[att.emailId].push(att);
        }
        return acc;
      },
      {} as Record<string, typeof emailAttachments>
    );

    // Merge attachments into emails
    const emailsWithAttachments = threadEmails.map((email) => ({
      ...email,
      attachments: attachmentsByEmailId[email.id] || [],
    }));

    // Get labels
    const threadLabelsData = await db
      .select({
        label: labels,
        appliedBy: threadLabels.appliedBy,
        confidence: threadLabels.confidence,
      })
      .from(threadLabels)
      .innerJoin(labels, eq(threadLabels.labelId, labels.id))
      .where(eq(threadLabels.threadId, id));

    // Mark as read
    if (!thread.isRead) {
      await db
        .update(threads)
        .set({ isRead: true, updatedAt: new Date() })
        .where(eq(threads.id, id));
    }

    return NextResponse.json({
      thread: {
        ...thread,
        emails: emailsWithAttachments,
        labels: threadLabelsData.map((tl) => ({
          ...tl.label,
          appliedBy: tl.appliedBy,
          confidence: tl.confidence,
        })),
      },
    });
  } catch (error) {
    console.error("Get thread error:", error);
    return NextResponse.json(
      { error: "Failed to fetch thread" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { isRead, isArchived, isStarred, isTrashed } = body;

    const updateData: Partial<typeof threads.$inferSelect> = {
      updatedAt: new Date(),
    };

    if (isRead !== undefined) updateData.isRead = isRead;
    if (isArchived !== undefined) updateData.isArchived = isArchived;
    if (isStarred !== undefined) updateData.isStarred = isStarred;
    if (isTrashed !== undefined) updateData.isTrashed = isTrashed;

    const [updated] = await db
      .update(threads)
      .set(updateData)
      .where(eq(threads.id, id))
      .returning();

    // Broadcast SSE event for thread update
    broadcastSSE({
      type: "thread_updated",
      data: { threadId: id },
    });

    return NextResponse.json({ thread: updated });
  } catch (error) {
    console.error("Update thread error:", error);
    return NextResponse.json(
      { error: "Failed to update thread" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    await db.delete(threads).where(eq(threads.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete thread error:", error);
    return NextResponse.json(
      { error: "Failed to delete thread" },
      { status: 500 }
    );
  }
}