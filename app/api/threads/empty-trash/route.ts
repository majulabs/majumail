import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { threads, emails, threadLabels } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all trashed threads
    const trashedThreads = await db.query.threads.findMany({
      where: eq(threads.isTrashed, true),
    });

    const threadIds = trashedThreads.map((t) => t.id);

    if (threadIds.length === 0) {
      return NextResponse.json({ deleted: 0 });
    }

    // Delete in order: threadLabels -> emails -> threads
    for (const threadId of threadIds) {
      await db.delete(threadLabels).where(eq(threadLabels.threadId, threadId));
      await db.delete(emails).where(eq(emails.threadId, threadId));
      await db.delete(threads).where(eq(threads.id, threadId));
    }

    return NextResponse.json({ deleted: threadIds.length });
  } catch (error) {
    console.error("Empty trash error:", error);
    return NextResponse.json(
      { error: "Failed to empty trash" },
      { status: 500 }
    );
  }
}