import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { labels, threadLabels, threads } from "@/lib/db/schema";
import { eq, sql, asc, and } from "drizzle-orm";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all labels with thread counts and unread counts
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

    // Also get global inbox unread count
    const [inboxStats] = await db
      .select({
        unreadCount: sql<number>`count(*)::int`,
      })
      .from(threads)
      .where(
        and(
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
      inboxUnreadCount: inboxStats?.unreadCount || 0,
    });
  } catch (error) {
    console.error("Get labels error:", error);
    return NextResponse.json(
      { error: "Failed to fetch labels" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, color, description, autoClassify } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    // Get max sort order
    const [maxOrder] = await db
      .select({ maxSort: sql<number>`max(${labels.sortOrder})` })
      .from(labels);

    const [label] = await db
      .insert(labels)
      .values({
        name,
        color: color || "#6b7280",
        description,
        autoClassify: autoClassify ?? true,
        sortOrder: (maxOrder?.maxSort || 0) + 1,
      })
      .returning();

    return NextResponse.json({ label });
  } catch (error) {
    console.error("Create label error:", error);
    return NextResponse.json(
      { error: "Failed to create label" },
      { status: 500 }
    );
  }
}
