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
  const archived = searchParams.get("archived") === "true";
  const trashed = searchParams.get("trashed") === "true";
  const starred = searchParams.get("starred") === "true";
  const filter = searchParams.get("filter"); // "sent" for outbound emails
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");

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

    // If filtering by sent/inbox, get threads with matching email direction
    if (filter === "sent") {
      // Get threads that have outbound emails
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

      // Intersect with existing threadIds if filtering by label too
      if (threadIds) {
        threadIds = threadIds.filter((id) => outboundThreadIds.includes(id));
      } else {
        threadIds = outboundThreadIds;
      }

      if (threadIds.length === 0) {
        return NextResponse.json({ threads: [], total: 0 });
      }
    } else if (!labelId && !archived && !trashed && !starred) {
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

    if (starred) {
      conditions.push(eq(threads.isStarred, true));
    }

    if (trashed) {
      conditions.push(eq(threads.isTrashed, true));
    } else {
      conditions.push(eq(threads.isTrashed, false));
    }

    if (archived) {
      conditions.push(eq(threads.isArchived, true));
    } else if (!trashed) {
      // Default: not archived unless specifically requested
      conditions.push(eq(threads.isArchived, false));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get threads with count
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

    // Get labels for each thread
    const threadIdsToFetch = threadsResult.map((t) => t.id);
    
    let labelsForThreads: Array<{
      threadId: string;
      labelId: string;
      appliedBy: string | null;
      confidence: number | null;
      label: typeof labels.$inferSelect;
    }> = [];

    if (threadIdsToFetch.length > 0) {
      labelsForThreads = await db
        .select({
          threadId: threadLabels.threadId,
          labelId: threadLabels.labelId,
          appliedBy: threadLabels.appliedBy,
          confidence: threadLabels.confidence,
          label: labels,
        })
        .from(threadLabels)
        .innerJoin(labels, eq(threadLabels.labelId, labels.id))
        .where(inArray(threadLabels.threadId, threadIdsToFetch));
    }

    // Group labels by thread
    const labelsByThread = labelsForThreads.reduce(
      (acc, item) => {
        if (!acc[item.threadId]) {
          acc[item.threadId] = [];
        }
        acc[item.threadId].push({
          ...item.label,
          appliedBy: item.appliedBy,
          confidence: item.confidence,
        });
        return acc;
      },
      {} as Record<string, Array<typeof labels.$inferSelect & { appliedBy: string | null; confidence: number | null }>>
    );

    const threadsWithLabels = threadsResult.map((thread) => ({
      ...thread,
      labels: labelsByThread[thread.id] || [],
    }));

    return NextResponse.json({
      threads: threadsWithLabels,
      total: Number(countResult[0]?.count || 0),
    });
  } catch (error) {
    console.error("Get threads error:", error);
    return NextResponse.json(
      { error: "Failed to fetch threads" },
      { status: 500 }
    );
  }
}
