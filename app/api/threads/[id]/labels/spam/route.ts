import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { threadLabels, labels } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { broadcastSSE } from "@/app/api/sse/route";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: threadId } = await params;

  try {
    // Find the Spam label
    const [spamLabel] = await db
      .select()
      .from(labels)
      .where(eq(labels.name, "Spam"))
      .limit(1);

    if (!spamLabel) {
      return NextResponse.json({ error: "Spam label not found" }, { status: 404 });
    }

    // Remove the Spam label from the thread
    await db
      .delete(threadLabels)
      .where(
        and(
          eq(threadLabels.threadId, threadId),
          eq(threadLabels.labelId, spamLabel.id)
        )
      );

    // Add the Inbox label back
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
          appliedBy: "user",
        })
        .onConflictDoNothing();
    }

    // Broadcast SSE event
    broadcastSSE({ type: "thread_updated", data: { threadId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Remove spam label error:", error);
    return NextResponse.json(
      { error: "Failed to remove spam label" },
      { status: 500 }
    );
  }
}