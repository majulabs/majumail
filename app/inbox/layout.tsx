import { Sidebar } from "@/components/layout/Sidebar";
import { db } from "@/lib/db";
import { labels, threadLabels, threads } from "@/lib/db/schema";
import { sql, asc, eq, and } from "drizzle-orm";

async function getLabelsWithCounts() {
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

  // Get inbox unread count (unread, not trashed, not archived)
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

  return {
    labels: labelsWithCounts.map((l) => ({
      ...l.label,
      threadCount: l.threadCount,
      unreadCount: l.unreadCount,
    })),
    inboxUnreadCount: inboxStats?.unreadCount || 0,
  };
}

export default async function InboxLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { labels: labelsData, inboxUnreadCount } = await getLabelsWithCounts();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar labels={labelsData} inboxUnreadCount={inboxUnreadCount} />
      <main className="flex-1 overflow-hidden lg:ml-0">
        {children}
      </main>
    </div>
  );
}
