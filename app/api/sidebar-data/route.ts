import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { labels, threadLabels, threads, emails } from "@/lib/db/schema";
import { sql, asc, eq, and } from "drizzle-orm";

export async function GET() {
  const labelsWithCounts = await db
    .select({
      label: labels,
      threadCount: sql<number>`count(DISTINCT ${threadLabels.threadId})::int`,
      unreadCount: sql<number>`count(DISTINCT CASE WHEN ${threads.isRead} = false AND ${threads.isTrashed} = false THEN ${threadLabels.threadId} END)::int`,
    })
    .from(labels)
    .leftJoin(threadLabels, eq(labels.id, threadLabels.labelId))
    .leftJoin(threads, eq(threadLabels.threadId, threads.id))
    .groupBy(labels.id)
    .orderBy(asc(labels.sortOrder), asc(labels.name));

  const inboxUnreadResult = await db
    .selectDistinct({ threadId: threads.id })
    .from(threads)
    .innerJoin(emails, eq(threads.id, emails.threadId))
    .where(
      and(
        eq(emails.direction, "inbound"),
        eq(threads.isRead, false),
        eq(threads.isTrashed, false),
        eq(threads.isArchived, false)
      )
    );

  return NextResponse.json({
    labels: labelsWithCounts.map((l) => ({
      ...l.label,
      threadCount: l.threadCount,
      unreadCount: l.unreadCount,
    })),
    inboxUnreadCount: inboxUnreadResult.length,
  });
}
