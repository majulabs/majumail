import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { threads, threadLabels, labels, emails } from "@/lib/db/schema";
import { eq, desc, and, sql, inArray } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const labelId = searchParams.get("labelId");
  const filter = searchParams.get("filter");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");

  // Parse filter parameter to determine view type
  const isStarredView = filter === "starred";
  const isArchivedView = filter === "archived";
  const isTrashedView = filter === "trash";
  const isSpamView = filter === "spam";
  const isSentView = filter === "sent";

  try {
    let threadIds: string[] | undefined;

    // If filtering by label
    if (labelId) {
      const labelThreads = await db
        .select({ threadId: threadLabels.threadId })
        .from(threadLabels)
        .where(eq(threadLabels.labelId, labelId));

      threadIds = labelThreads.map((t) => t.threadId);

      if (threadIds.length === 0) {
        return NextResponse.json({ threads: [], total: 0 });
      }
    }

    // If filtering by spam, get threads with Spam label
    if (isSpamView) {
      const [spamLabel] = await db
        .select()
        .from(labels)
        .where(eq(labels.name, "Spam"))
        .limit(1);

      if (spamLabel) {
        const spamThreads = await db
          .select({ threadId: threadLabels.threadId })
          .from(threadLabels)
          .where(eq(threadLabels.labelId, spamLabel.id));

        const spamThreadIds = spamThreads.map((t) => t.threadId);

        if (spamThreadIds.length === 0) {
          return NextResponse.json({ threads: [], total: 0 });
        }

        if (threadIds) {
          threadIds = threadIds.filter((id) => spamThreadIds.includes(id));
        } else {
          threadIds = spamThreadIds;
        }

        if (threadIds.length === 0) {
          return NextResponse.json({ threads: [], total: 0 });
        }
      } else {
        return NextResponse.json({ threads: [], total: 0 });
      }
    }

    // If filtering by sent, get threads with outbound emails
    if (isSentView) {
      const outboundThreads = await db
        .selectDistinct({ threadId: emails.threadId })
        .from(emails)
        .where(eq(emails.direction, "outbound"));

      const outboundThreadIds = outboundThreads
        .map((t) => t.threadId)
        .filter((id): id is string => id !== null);

      if (outboundThreadIds.length === 0) {
        return NextResponse.json({ threads: [], total: 0 });
      }

      if (threadIds) {
        threadIds = threadIds.filter((id) => outboundThreadIds.includes(id));
      } else {
        threadIds = outboundThreadIds;
      }

      if (threadIds.length === 0) {
        return NextResponse.json({ threads: [], total: 0 });
      }
    } else if (!labelId && !isArchivedView && !isTrashedView && !isStarredView && !isSpamView) {
      // Default inbox view: only show threads with inbound emails
      const inboundThreads = await db
        .selectDistinct({ threadId: emails.threadId })
        .from(emails)
        .where(eq(emails.direction, "inbound"));

      const inboundThreadIds = inboundThreads
        .map((t) => t.threadId)
        .filter((id): id is string => id !== null);

      if (inboundThreadIds.length === 0) {
        return NextResponse.json({ threads: [], total: 0 });
      }

      threadIds = inboundThreadIds;
    }

    // Build where conditions
    const conditions = [];

    if (threadIds) {
      conditions.push(inArray(threads.id, threadIds));
    }

    // Handle starred filter
    if (isStarredView) {
      conditions.push(eq(threads.isStarred, true));
    }

    // Handle trash filter
    if (isTrashedView) {
      conditions.push(eq(threads.isTrashed, true));
    } else {
      // Default: not in trash
      conditions.push(eq(threads.isTrashed, false));
    }

    // Handle archive filter
    if (isArchivedView) {
      conditions.push(eq(threads.isArchived, true));
    } else if (!isTrashedView && !isSpamView) {
      // Default: not archived (unless viewing trash or spam)
      conditions.push(eq(threads.isArchived, false));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Fetch threads
    const [threadsResult, countResult] = await Promise.all([
      db
        .select()
        .from(threads)
        .where(whereClause)
        .orderBy(desc(threads.lastMessageAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(threads)
        .where(whereClause),
    ]);

    // Get labels for threads
    const threadIdsToFetch = threadsResult.map((t) => t.id);
    let labelsForThreads: Array<{
      threadId: string;
      label: typeof labels.$inferSelect;
      appliedBy: string | null;
      confidence: number | null;
    }> = [];

    if (threadIdsToFetch.length > 0) {
      labelsForThreads = await db
        .select({
          threadId: threadLabels.threadId,
          label: labels,
          appliedBy: threadLabels.appliedBy,
          confidence: threadLabels.confidence,
        })
        .from(threadLabels)
        .innerJoin(labels, eq(threadLabels.labelId, labels.id))
        .where(inArray(threadLabels.threadId, threadIdsToFetch));
    }

    // Combine threads with their labels
    const threadsWithLabels = threadsResult.map((thread) => ({
      ...thread,
      labels: labelsForThreads
        .filter((l) => l.threadId === thread.id)
        .map((l) => ({
          ...l.label,
          appliedBy: l.appliedBy,
          confidence: l.confidence,
        })),
    }));

    return NextResponse.json({
      threads: threadsWithLabels,
      total: countResult[0]?.count || 0,
    });
  } catch (error) {
    console.error("Fetch threads error:", error);
    return NextResponse.json(
      { error: "Failed to fetch threads" },
      { status: 500 }
    );
  }
}